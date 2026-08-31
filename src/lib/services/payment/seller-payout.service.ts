// ─────────────────────────────────────────────────────────────────────────────
// Seller Payout Service — Atomic batch payment via Binance + sync polling
//
// Flow:
//   1. DB transaction: validate + create Payment(PENDING) + mark batch.isPaid
//   2. Outside transaction: call binance.withdrawFunds()
//   3. If OK → update Payment with binanceTxId
//   4. If FAIL → revert batch.isPaid, mark Payment as FAILED
//
// Prevents double payment via:
//   - batch.isPaid check (application level)
//   - withdrawOrderId: BATCH_<id>_<attempt> (Binance idempotency — unique per attempt,
//     so a manual retry after a FAILED payout never collides with the previous one)
//   - Payment record unique per batch (implicit — we check before creating)
// ─────────────────────────────────────────────────────────────────────────────

import { Decimal } from '@prisma/client/runtime/client';
import prisma from '@/lib/prisma';
import binance from '@/lib/services/payment/binance.service';
import { computeFaceValueTotal } from '@/lib/services/pricing';
import { publishToRole, publishToUser } from '@/lib/realtime/bus';
import { logger } from '@/lib/logger';
import { formatCurrency } from '@/lib/utils';
import { PaymentDirection, PaymentCategory, PaymentStatus, PaymentReferenceType } from '@/generated/prisma/client';
import type { Asset, Network } from '@/types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PayoutResult {
  batchId: number;
  paymentId: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  error?: string;
}

export interface SyncResult {
  total: number;
  resolved: number;
  failed: number;
  stillPending: number;
  errors: string[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const WITHDRAW_ORDER_PREFIX = 'BATCH_';

// ── Execute Payout ───────────────────────────────────────────────────────────

/**
 * Executes a payout to a seller for a confirmed batch.
 *
 * Step 1 (inside transaction): validate + create Payment(PENDING) + mark isPaid
 * Step 2 (outside transaction): call Binance withdraw API
 * Step 3: handle success/failure
 *
 * The transaction is kept minimal — no external calls inside it.
 *
 * source='auto' (auto-pay flows) additionally alerts admins on failure
 * (fire-and-forget) since there is no human watching the result.
 */
export async function executeSellerPayout(batchId: number, source: 'manual' | 'auto' = 'manual'): Promise<PayoutResult> {
  // ── Step 1: DB transaction (validate + reserve) ──────────────────────────
  let paymentRecord: {
    id: string;
    amount: Decimal;
    batchId: number | null;
  };
  let payoutAmount: Decimal;
  let sellerId: string | null;
  let walletAddress: string;
  let coinSymbol: Asset;
  let networkName: Network;
  let isBinanceWallet: boolean;
  let withdrawOrderId: string;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // 1a. Load batch with giftcards and seller info
        const batch = await tx.giftcardBatch.findUnique({
          where: { id: batchId },
          include: {
            giftcards: true,
            user: {
              select: {
                id: true,
                paymentMethod: {
                  select: {
                    address: true,
                    coin: { select: { symbol: true } },
                    network: { select: { name: true } },
                    isBinanceWallet: true,
                  },
                },
              },
            },
          },
        });

        if (!batch) {
          throw new PayoutError(`Lote #${batchId} no encontrado.`);
        }

        if (batch.isPaid) {
          throw new PayoutError(`Lote #${batchId} ya fue pagado.`);
        }

        if (batch.giftcards.length === 0) {
          throw new PayoutError(`Lote #${batchId} no tiene tarjetas.`);
        }

        const allConfirmed = batch.giftcards.every((g) => g.isConfirmed);
        if (!allConfirmed) {
          throw new PayoutError(`Lote #${batchId} tiene tarjetas sin confirmar.`);
        }

        if (!batch.user?.paymentMethod) {
          throw new PayoutError(`El vendedor del lote #${batchId} no tiene método de pago configurado.`);
        }

        // 1b. Compute payout amount (rounded to 2dp to match DB Decimal(10,2) precision)
        const faceValueTotal = computeFaceValueTotal(batch.giftcards);
        payoutAmount = faceValueTotal.mul(batch.sellRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

        if (payoutAmount.lte(0)) {
          throw new PayoutError(`El monto a pagar del lote #${batchId} es cero o negativo.`);
        }

        // 1b2. Platform balance guard — never let the balance go negative silently
        const balanceSetting = await tx.platformSettings.findUnique({
          where: { key: 'platformBalance' },
          select: { balance: true },
        });
        const platformBalance = balanceSetting?.balance ?? new Decimal(0);

        if (platformBalance.lt(payoutAmount)) {
          throw new PayoutError(
            `Balance de plataforma insuficiente para el lote #${batchId} (disponible: ${formatCurrency(platformBalance.toNumber())}, requerido: ${formatCurrency(payoutAmount.toNumber())}).`,
            payoutAmount.toNumber(),
          );
        }

        // 1c. Check for existing payment on this batch (belt-and-suspenders)
        const existingPayment = await tx.payment.findFirst({
          where: {
            batchId: batchId,
            category: PaymentCategory.BATCH,
            direction: PaymentDirection.DEBIT,
            status: { not: PaymentStatus.FAILED },
          },
        });

        if (existingPayment) {
          throw new PayoutError(`Ya existe un pago activo para el lote #${batchId} (ref: ${existingPayment.id}).`);
        }

        // 1d. Decrement platform balance
        const updatedSettings = await tx.platformSettings.upsert({
          where: { key: 'platformBalance' },
          update: { balance: { decrement: payoutAmount } },
          create: { key: 'platformBalance', value: '', description: 'Balance General', balance: payoutAmount.negated() },
        });

        // 1e. Create Payment(PENDING) + mark batch.isPaid
        // withdrawOrderId is unique per attempt (BATCH_<id>_<n>) so a retry after a
        // FAILED payout never collides with the previous Binance idempotency key.
        const attemptCount = await tx.payment.count({
          where: {
            batchId: batchId,
            category: PaymentCategory.BATCH,
            direction: PaymentDirection.DEBIT,
          },
        });
        const attemptWithdrawOrderId = `${WITHDRAW_ORDER_PREFIX}${batchId}_${attemptCount + 1}`;

        const payment = await tx.payment.create({
          data: {
            amount: payoutAmount,
            balanceAfter: updatedSettings.balance,
            direction: PaymentDirection.DEBIT,
            category: PaymentCategory.BATCH,
            status: PaymentStatus.PENDING,
            transactionId: attemptWithdrawOrderId,
            batchId: batchId,
            relatedUserId: batch.userId ?? undefined,
            isBinanceWallet: batch.user?.paymentMethod?.isBinanceWallet ?? false,
            referenceType: PaymentReferenceType.BATCH,
            referenceId: String(batchId),
            notes: `Pago a seller por lote #${batchId} — pendiente de confirmación Binance`,
          },
        });

        await tx.giftcardBatch.update({
          where: { id: batchId },
          data: { isPaid: true },
        });

        return {
          payment,
          payoutAmount,
          sellerId: batch.userId,
          walletAddress: batch.user.paymentMethod.address,
          coinSymbol: batch.user.paymentMethod.coin.symbol as Asset,
          networkName: batch.user.paymentMethod.network.name as Network,
          isBinanceWallet: batch.user.paymentMethod.isBinanceWallet,
          withdrawOrderId: attemptWithdrawOrderId,
        };
      },
      { isolationLevel: 'Serializable' },
    );

    paymentRecord = result.payment;
    payoutAmount = result.payoutAmount;
    sellerId = result.sellerId;
    walletAddress = result.walletAddress;
    coinSymbol = result.coinSymbol;
    networkName = result.networkName;
    isBinanceWallet = result.isBinanceWallet;
    withdrawOrderId = result.withdrawOrderId;
  } catch (error) {
    if (error instanceof PayoutError) {
      if (source === 'auto') {
        alertAdminPayoutFailed(batchId, error.amount ?? 0, error.message);
      }
      return {
        batchId,
        paymentId: '',
        amount: 0,
        status: 'FAILED',
        error: error.message,
      };
    }
    logger.error('Error en transacción DB para payout', {
      flow: 'payment',
      action: 'execute-seller-payout',
      metadata: { batchId },
      error: { name: (error as Error).name, message: (error as Error).message },
    });
    if (source === 'auto') {
      alertAdminPayoutFailed(batchId, 0, 'Error interno al preparar el pago.');
    }
    return {
      batchId,
      paymentId: '',
      amount: 0,
      status: 'FAILED',
      error: 'Error interno al preparar el pago.',
    };
  }

  // ── Step 2: Call Binance (OUTSIDE transaction) ──────────────────────────

  const response = await binance.withdrawFunds({
    coin: coinSymbol,
    network: networkName,
    address: walletAddress,
    amount: payoutAmount.toFixed(2),
    withdrawOrderId,
    walletType: 1, // Funding wallet
    transactionFeeFlag: true, // Platform absorbs internal transfer fee — seller receives full amount
  });

  // ── Step 3: Handle response ─────────────────────────────────────────────

  if (response.success) {
    // Binance accepted the withdrawal — but we only have the internal Binance ID (response.data.id).
    // The real blockchain TxID (record.txId) will be available in withdraw/history AFTER on-chain confirmation.
    // The sync job (syncPendingSellerPayments) will fill binanceTxId with the blockchain txId.
    const binanceRef = response.data.id;

    try {
      await prisma.payment.update({
        where: { id: paymentRecord.id },
        data: {
          notes: `Pago a seller por lote #${batchId} — enviado a Binance (Ref: ${binanceRef})`,
        },
      });
    } catch (dbError) {
      // Critical: Binance withdrawal succeeded but DB update failed
      // The sync job will resolve this
      logger.error('[CRITICAL] Binance payout succeeded but DB update failed', {
        flow: 'payment',
        action: 'execute-seller-payout',
        metadata: { batchId, paymentId: paymentRecord.id, binanceRef },
        error: { name: (dbError as Error).name, message: (dbError as Error).message },
      });
    }

    logger.info('Pago a seller enviado a Binance', {
      flow: 'payment',
      action: 'execute-seller-payout',
      metadata: {
        batchId,
        paymentId: paymentRecord.id,
        amount: payoutAmount.toNumber(),
        binanceRef,
        sellerId,
      },
    });

    // Immediate feedback — the "paid" notification comes later, when the sync
    // confirms the withdrawal on Binance's side
    notifySellerPayoutSent(sellerId, batchId, payoutAmount.toNumber());

    // Invalidación realtime: batch marcado isPaid + payment PENDING visible
    if (sellerId) publishToUser(sellerId, ['batches', 'stats']);
    publishToRole('ADMIN', ['payments']);

    return {
      batchId,
      paymentId: paymentRecord.id,
      amount: payoutAmount.toNumber(),
      status: 'PENDING',
    };
  }

  // ── Binance rejected the withdrawal ────────────────────────────────────

  if (response.isNetworkError) {
    // Network error: withdrawal may or may not have been processed
    // Leave payment as PENDING — sync job will resolve it
    logger.warn('Pago a seller: error de red con Binance (pendiente de resolución)', {
      flow: 'payment',
      action: 'execute-seller-payout',
      metadata: { batchId, paymentId: paymentRecord.id },
    });

    return {
      batchId,
      paymentId: paymentRecord.id,
      amount: payoutAmount.toNumber(),
      status: 'PENDING',
      error: 'Error de red — el pago quedó pendiente y se resolverá automáticamente.',
    };
  }

  // API error (rejected by Binance — e.g. min amount, invalid address, insufficient balance)
  const errorMessage = response.error;

  // Revert: mark batch as not paid, payment as failed, and restore platform balance
  try {
    await prisma.$transaction(async (tx) => {
      const revertedSettings = await tx.platformSettings.upsert({
        where: { key: 'platformBalance' },
        update: { balance: { increment: payoutAmount } },
        create: { key: 'platformBalance', value: '', description: 'Balance General', balance: payoutAmount },
      });

      await tx.giftcardBatch.update({
        where: { id: batchId },
        data: { isPaid: false },
      });

      await tx.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: PaymentStatus.FAILED,
          balanceAfter: revertedSettings.balance,
          notes: `Pago rechazado por Binance: ${errorMessage}`,
        },
      });
    });
  } catch (revertError) {
    // Even if revert fails, the sync job will eventually clean up
    logger.error('Error revirtiendo batch/payment tras fallo de Binance', {
      flow: 'payment',
      action: 'execute-seller-payout',
      metadata: { batchId, paymentId: paymentRecord.id },
      error: { name: (revertError as Error).name, message: (revertError as Error).message },
    });
  }

  logger.warn('Pago a seller rechazado por Binance', {
    flow: 'payment',
    action: 'execute-seller-payout',
    metadata: {
      batchId,
      paymentId: paymentRecord.id,
      amount: payoutAmount.toNumber(),
      error: errorMessage,
      sellerId,
    },
  });

  if (source === 'auto') {
    alertAdminPayoutFailed(batchId, payoutAmount.toNumber(), `Binance rechazó el pago: ${errorMessage}`);
  }

  // Invalidación realtime: el revert deja el batch como no pagado
  if (sellerId) publishToUser(sellerId, ['batches', 'stats']);
  publishToRole('ADMIN', ['payments']);

  return {
    batchId,
    paymentId: paymentRecord.id,
    amount: payoutAmount.toNumber(),
    status: 'FAILED',
    error: `Binance rechazó el pago: ${errorMessage}`,
  };
}

/**
 * Fire-and-forget admin alert for failed automatic payouts.
 * Never throws — alerting must not break the payout flow.
 */
function alertAdminPayoutFailed(batchId: number, amount: number, reason: string): void {
  import('@/lib/notifications')
    .then(({ notifyAdminPayoutFailed }) => notifyAdminPayoutFailed(batchId, amount, reason))
    .catch((err) =>
      logger.error('Error notificando admin sobre payout fallido', {
        flow: 'payment',
        action: 'execute-seller-payout',
        metadata: { batchId, amount },
        error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : String(err) },
      }),
    );
}

/**
 * Fire-and-forget seller notification right after Binance accepts the payout.
 * Never throws — notifying must not break the payout flow.
 */
function notifySellerPayoutSent(sellerId: string | null, batchId: number, amount: number): void {
  if (!sellerId) return;

  import('@/lib/notifications')
    .then(({ notifySellerBatchPayoutSent }) => notifySellerBatchPayoutSent(sellerId, batchId, amount))
    .catch((err) =>
      logger.error('Error notificando seller sobre payout enviado', {
        flow: 'payment',
        action: 'execute-seller-payout',
        metadata: { batchId, sellerId, amount },
        error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : String(err) },
      }),
    );
}

// ── Sync Pending Seller Payments ─────────────────────────────────────────────

/**
 * Polls Binance for status updates on PENDING batch payments.
 * Designed to be called periodically (cron, manual trigger, etc.)
 *
 * Uses withdrawOrderId (BATCH_<batchId>_<attempt>) to query Binance withdraw history.
 */
export async function syncPendingSellerPayments(): Promise<SyncResult> {
  const pendingPayments = await prisma.payment.findMany({
    where: {
      status: PaymentStatus.PENDING,
      category: PaymentCategory.BATCH,
      direction: PaymentDirection.DEBIT,
      transactionId: { not: null },
    },
    include: {
      batch: { select: { id: true, userId: true } },
    },
  });

  const results: SyncResult = {
    total: pendingPayments.length,
    resolved: 0,
    failed: 0,
    stillPending: 0,
    errors: [],
  };

  if (pendingPayments.length === 0) return results;

  const syncResults = await Promise.all(
    pendingPayments.map(async (payment) => {
      try {
        const history = await binance.getWithdrawHistory({
          withdrawOrderId: payment.transactionId!,
        });

        if (!history || history.length === 0) {
          return { type: 'stillPending' as const };
        }

        const record = history[0];

        // Status 6 = COMPLETED
        if (record.status === 6) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.COMPLETED,
              binanceTxId: record.txId,
              notes: `Pago a seller completado vía Binance (TxID: ${record.txId})`,
            },
          });

          // Notify seller
          if (payment.batch?.userId) {
            const { notifySellerBatchPaid } = await import('@/lib/notifications');
            notifySellerBatchPaid(payment.batch.userId, payment.batchId!, Number(payment.amount)).catch((err) =>
              logger.error('Error notificando seller post-sync', {
                flow: 'payment',
                action: 'sync-seller-payments',
                metadata: { userId: payment.batch?.userId, batchId: payment.batchId },
                error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : String(err) },
              }),
            );

            // Invalidación realtime: el seller ve el batch pagado <1s después
            // de que el cron detecta la confirmación on-chain
            publishToUser(payment.batch.userId, ['batches', 'stats']);
          }
          publishToRole('ADMIN', ['payments']);

          return { type: 'resolved' as const };
        }

        // Status 1, 3, 5 = CANCELLED, REJECTED, FAILURE → FAILED
        if ([1, 3, 5].includes(record.status)) {
          await prisma.$transaction(async (tx) => {
            const revertedSettings = await tx.platformSettings.upsert({
              where: { key: 'platformBalance' },
              update: { balance: { increment: payment.amount } },
              create: { key: 'platformBalance', value: '', description: 'Balance General', balance: payment.amount },
            });

            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: PaymentStatus.FAILED,
                balanceAfter: revertedSettings.balance,
                notes: `Pago fallido en Binance (estado: ${record.status})${record.info ? `: ${record.info}` : ''}`,
              },
            });

            // Revert batch.isPaid so it can be retried
            if (payment.batchId) {
              await tx.giftcardBatch.update({
                where: { id: payment.batchId },
                data: { isPaid: false },
              });
            }
          });

          // Alert admin — a payout accepted by Binance later failed on their side
          // and needs a manual retry (no human is watching automatic payouts).
          if (payment.batchId) {
            alertAdminPayoutFailed(
              payment.batchId,
              Number(payment.amount),
              `Pago fallido en Binance tras ser aceptado (estado: ${record.status})${record.info ? `: ${record.info}` : ''}`,
            );
          }

          // Invalidación realtime: payment FAILED + batch.isPaid revertido
          if (payment.batch?.userId) {
            publishToUser(payment.batch.userId, ['batches', 'stats']);
          }
          publishToRole('ADMIN', ['payments']);

          return { type: 'failed' as const };
        }

        // Status 0, 2, 4, 7 = still processing
        return { type: 'stillPending' as const };
      } catch (error) {
        logger.error('Error sincronizando pago de seller', {
          flow: 'payment',
          action: 'sync-seller-payments',
          metadata: { paymentId: payment.id, transactionId: payment.transactionId },
          error: { name: (error as Error).name, message: (error as Error).message },
        });
        return {
          type: 'error' as const,
          message: `Error sync ${payment.transactionId}: ${(error as Error).message}`,
        };
      }
    }),
  );

  syncResults.forEach((res) => {
    if (res.type === 'resolved') results.resolved++;
    else if (res.type === 'failed') results.failed++;
    else if (res.type === 'stillPending') results.stillPending++;
    else if (res.type === 'error') {
      results.errors.push(res.message!);
      results.stillPending++;
    }
  });

  if (results.resolved > 0 || results.failed > 0) {
    logger.info('Sync de pagos a sellers completado', {
      flow: 'payment',
      action: 'sync-seller-payments',
      metadata: {
        total: results.total,
        resolved: results.resolved,
        failed: results.failed,
        stillPending: results.stillPending,
      },
    });
  }

  return results;
}

// ── Error Class ──────────────────────────────────────────────────────────────

class PayoutError extends Error {
  constructor(
    message: string,
    public readonly amount?: number,
  ) {
    super(message);
    this.name = 'PayoutError';
  }
}
