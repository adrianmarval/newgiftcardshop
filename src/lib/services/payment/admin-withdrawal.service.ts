// ─────────────────────────────────────────────────────────────────────────────
// Admin Withdrawal Service — platform profit withdrawal via Binance + sync polling
//
// Flow (mirrors seller-payout.service.ts):
//   1. DB transaction: validate + decrement platformBalance + create Payment(PENDING)
//   2. Outside transaction: call binance.withdrawFunds()
//   3. If OK → keep PENDING (sync fills binanceTxId + marks COMPLETED on-chain)
//      If REJECTED → revert balance + mark Payment as FAILED
//      If NETWORK ERROR → keep PENDING (sync resolves it)
//
// Destination is FIXED by env (WITHDRAW_WALLET/WITHDRAW_COIN/WITHDRAW_NETWORK) —
// the admin's savings wallet, not configurable per request.
//
// Prevents double withdrawal via:
//   - PENDING WITHDRAWAL guard (one in-flight admin withdrawal at a time)
//   - withdrawOrderId: WD_<timestamp> (Binance idempotency key)
//   - platformBalance guard (never withdraw more than the ledger holds)
// ─────────────────────────────────────────────────────────────────────────────

import { Decimal } from '@prisma/client/runtime/client';
import prisma from '@/lib/prisma';
import binance from '@/lib/services/payment/binance.service';
import { logger } from '@/lib/logger';
import { PaymentDirection, PaymentCategory, PaymentStatus, PaymentReferenceType } from '@/generated/prisma/client';
import type { Asset, Network } from '@/types';
import type { SyncResult } from './seller-payout.service';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdminWithdrawalResult {
  paymentId: string;
  amount: number;
  status: 'PENDING' | 'FAILED';
  error?: string;
}

export interface WithdrawDestinationInfo {
  configured: boolean;
  walletMasked?: string;
  coin?: string;
  network?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const WITHDRAW_ORDER_PREFIX = 'WD_';

// ── Error Class ──────────────────────────────────────────────────────────────

export class WithdrawalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WithdrawalError';
  }
}

// ── Destination ──────────────────────────────────────────────────────────────

function getWithdrawDestination(): { wallet: string; coin: Asset; network: Network } {
  const wallet = process.env.WITHDRAW_WALLET;
  const coin = process.env.WITHDRAW_COIN as Asset | undefined;
  const network = process.env.WITHDRAW_NETWORK as Network | undefined;

  if (!wallet || !coin || !network) {
    throw new WithdrawalError('Retiro no configurado en el servidor (WITHDRAW_WALLET/WITHDRAW_COIN/WITHDRAW_NETWORK).');
  }

  return { wallet, coin, network };
}

/** Info pública del destino (wallet enmascarada) para mostrar en la UI. */
export function getWithdrawDestinationInfo(): WithdrawDestinationInfo {
  try {
    const { wallet, coin, network } = getWithdrawDestination();
    const walletMasked = wallet.length > 10 ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : '***';
    return { configured: true, walletMasked, coin, network };
  } catch {
    return { configured: false };
  }
}

// ── Execute Withdrawal ───────────────────────────────────────────────────────

/**
 * Executes a platform profit withdrawal to the admin's env-configured wallet.
 *
 * Step 1 (inside transaction): dup guard + balance guard + decrement + Payment(PENDING)
 * Step 2 (outside transaction): call Binance withdraw API
 * Step 3: handle acceptance (stays PENDING for sync) / rejection (revert) / network error
 *
 * Throws WithdrawalError for validation failures (safe to surface to the admin).
 */
export async function executeAdminWithdrawal({
  amount,
  notes,
}: {
  amount: Decimal;
  notes?: string;
}): Promise<AdminWithdrawalResult> {
  const destination = getWithdrawDestination();
  const withdrawOrderId = `${WITHDRAW_ORDER_PREFIX}${Date.now()}`;
  const baseNotes = notes?.trim() || 'Retiro de ganancias';

  // ── Step 1: DB transaction (validate + decrement + reserve) ────────────────
  let paymentRecord: { id: string };

  try {
    paymentRecord = await prisma.$transaction(
      async (tx) => {
        // 1a. One in-flight admin withdrawal at a time — a PENDING one means the
        // previous attempt needs sync resolution before retrying (avoids duplicates)
        const existingPending = await tx.payment.findFirst({
          where: {
            status: PaymentStatus.PENDING,
            category: PaymentCategory.WITHDRAWAL,
            direction: PaymentDirection.DEBIT,
          },
        });

        if (existingPending) {
          throw new WithdrawalError(
            'Ya existe un retiro pendiente de sincronización. Usa "Sincronizar Binance" para resolverlo antes de intentar uno nuevo.',
          );
        }

        // 1b. Platform balance guard — never withdraw more than the ledger holds
        const balanceSetting = await tx.platformSettings.findUnique({
          where: { key: 'platformBalance' },
          select: { balance: true },
        });
        const platformBalance = balanceSetting?.balance ?? new Decimal(0);

        if (platformBalance.lt(amount)) {
          throw new WithdrawalError(
            `Balance de plataforma insuficiente (disponible: $${platformBalance.toFixed(2)}, requerido: $${amount.toFixed(2)}).`,
          );
        }

        // 1c. Decrement platform balance (the funds are spoken for from this moment)
        const updatedSettings = await tx.platformSettings.upsert({
          where: { key: 'platformBalance' },
          update: { balance: { decrement: amount } },
          create: { key: 'platformBalance', value: '', description: 'Balance General', balance: amount.negated() },
        });

        // 1d. Create Payment(PENDING)
        const payment = await tx.payment.create({
          data: {
            amount,
            balanceAfter: updatedSettings.balance,
            direction: PaymentDirection.DEBIT,
            category: PaymentCategory.WITHDRAWAL,
            status: PaymentStatus.PENDING,
            transactionId: withdrawOrderId,
            isBinanceWallet: true,
            referenceType: PaymentReferenceType.MANUAL,
            notes: `${baseNotes} — pendiente de confirmación Binance`,
          },
          select: { id: true },
        });

        return payment;
      },
      { isolationLevel: 'Serializable' },
    );
  } catch (error) {
    if (error instanceof WithdrawalError) throw error;
    logger.error('Error en transacción DB para retiro de admin', {
      flow: 'payment',
      action: 'admin-withdrawal',
      error: { name: (error as Error).name, message: (error as Error).message },
    });
    throw new WithdrawalError('No se pudo inicializar el retiro en la base de datos.');
  }

  // ── Step 2: Call Binance (OUTSIDE transaction) ─────────────────────────────

  const response = await binance.withdrawFunds({
    address: destination.wallet,
    amount: amount.toFixed(2),
    coin: destination.coin,
    network: destination.network,
    transactionFeeFlag: true,
    walletType: 1, // Funding wallet
    withdrawOrderId,
  });

  // ── Step 3: Handle response ────────────────────────────────────────────────

  if (response.success) {
    // Binance accepted the withdrawal — the real blockchain TxID only appears in
    // withdraw/history AFTER on-chain confirmation, so the payment stays PENDING
    // and syncPendingAdminWithdrawals() completes it (cron 5min + botón manual).
    const binanceRef = response.data.id;

    try {
      await prisma.payment.update({
        where: { id: paymentRecord.id },
        data: { notes: `${baseNotes} — enviado a Binance (Ref: ${binanceRef})` },
      });
    } catch (dbError) {
      // Critical: Binance withdrawal succeeded but DB update failed — sync resolves it
      logger.error('[CRITICAL] Retiro de admin aceptado por Binance pero falló el update local', {
        flow: 'payment',
        action: 'admin-withdrawal',
        metadata: { paymentId: paymentRecord.id, binanceRef },
        error: { name: (dbError as Error).name, message: (dbError as Error).message },
      });
    }

    logger.info('Retiro de admin enviado a Binance', {
      flow: 'payment',
      action: 'admin-withdrawal',
      metadata: { paymentId: paymentRecord.id, amount: amount.toNumber(), binanceRef, withdrawOrderId },
    });

    return { paymentId: paymentRecord.id, amount: amount.toNumber(), status: 'PENDING' };
  }

  if (response.isNetworkError) {
    // Network error: withdrawal may or may not have been processed.
    // Leave payment as PENDING — sync job will resolve it.
    logger.warn('Retiro de admin: error de red con Binance (pendiente de resolución)', {
      flow: 'payment',
      action: 'admin-withdrawal',
      metadata: { paymentId: paymentRecord.id, withdrawOrderId },
    });

    return {
      paymentId: paymentRecord.id,
      amount: amount.toNumber(),
      status: 'PENDING',
      error: 'Error de red — el retiro quedó pendiente y se resolverá automáticamente.',
    };
  }

  // ── Binance rejected the withdrawal → revert balance + mark FAILED ─────────
  const errorMessage = response.error;

  try {
    await prisma.$transaction(async (tx) => {
      const revertedSettings = await tx.platformSettings.upsert({
        where: { key: 'platformBalance' },
        update: { balance: { increment: amount } },
        create: { key: 'platformBalance', value: '', description: 'Balance General', balance: amount },
      });

      await tx.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: PaymentStatus.FAILED,
          balanceAfter: revertedSettings.balance,
          notes: `Retiro rechazado por Binance: ${errorMessage}`,
        },
      });
    });
  } catch (revertError) {
    // Even if revert fails, the sync job will eventually clean up
    logger.error('Error revirtiendo balance tras rechazo de retiro de admin', {
      flow: 'payment',
      action: 'admin-withdrawal',
      metadata: { paymentId: paymentRecord.id },
      error: { name: (revertError as Error).name, message: (revertError as Error).message },
    });
  }

  logger.warn('Retiro de admin rechazado por Binance', {
    flow: 'payment',
    action: 'admin-withdrawal',
    metadata: { paymentId: paymentRecord.id, amount: amount.toNumber(), error: errorMessage },
  });

  return {
    paymentId: paymentRecord.id,
    amount: amount.toNumber(),
    status: 'FAILED',
    error: `Binance rechazó el retiro: ${errorMessage}`,
  };
}

// ── Sync Pending Admin Withdrawals ───────────────────────────────────────────

/**
 * Polls Binance for status updates on PENDING admin withdrawals.
 * Designed to be called periodically (cron 5min en server.ts) y desde el botón
 * "Sincronizar Binance" del panel de payments.
 *
 * Uses withdrawOrderId (WD_<timestamp>) to query Binance withdraw history.
 * Balance invariant: the decrement happened at creation — COMPLETED never touches
 * the balance; FAILED reverts (increment) exactly once.
 */
export async function syncPendingAdminWithdrawals(): Promise<SyncResult> {
  const pendingWithdrawals = await prisma.payment.findMany({
    where: {
      status: PaymentStatus.PENDING,
      category: PaymentCategory.WITHDRAWAL,
      direction: PaymentDirection.DEBIT,
      transactionId: { not: null },
    },
  });

  const results: SyncResult = {
    total: pendingWithdrawals.length,
    resolved: 0,
    failed: 0,
    stillPending: 0,
    errors: [],
  };

  if (pendingWithdrawals.length === 0) return results;

  const syncResults = await Promise.all(
    pendingWithdrawals.map(async (payment) => {
      try {
        const history = await binance.getWithdrawHistory({
          withdrawOrderId: payment.transactionId!,
        });

        if (!history || history.length === 0) {
          return { type: 'stillPending' as const };
        }

        const record = history[0];

        // Status 6 = COMPLETED (balance already decremented at creation)
        if (record.status === 6) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.COMPLETED,
              binanceTxId: record.txId || null,
              notes: `Retiro completado vía Binance (TxID: ${record.txId})`,
            },
          });
          return { type: 'resolved' as const };
        }

        // Status 1, 3, 5 = CANCELLED, REJECTED, FAILURE → revert balance + FAILED
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
                notes: `Retiro fallido en Binance (estado: ${record.status})${record.info ? `: ${record.info}` : ''}`,
              },
            });
          });
          return { type: 'failed' as const };
        }

        // Status 0, 2, 4 = still processing
        return { type: 'stillPending' as const };
      } catch (error) {
        logger.error('Error sincronizando retiro de admin', {
          flow: 'payment',
          action: 'sync-admin-withdrawals',
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
    logger.info('Sync de retiros de admin completado', {
      flow: 'payment',
      action: 'sync-admin-withdrawals',
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
