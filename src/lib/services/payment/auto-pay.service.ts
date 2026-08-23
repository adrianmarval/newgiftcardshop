// ─────────────────────────────────────────────────────────────────────────────
// Auto-Pay Service — Automatic seller payouts when auto_pay_sellers is enabled
//
// Mirrors the auto-cancel pattern (batch-cancel.service.ts):
//   - Event trigger: triggerAutoPayForOrder() runs post-commit from
//     confirmOrderUsage/cancelOrder (order-lifecycle.service.ts)
//   - Cron safety net: sweepPayableBatches() runs every 5min (server.ts)
//
// Eligibility: batch not paid, not cancelled, all cards confirmed, payable > 0
// (canCancelBatch = false — zero-payable batches belong to auto-cancel).
//
// Policy decisions:
//   - Seller without wallet: notify seller + admin once (event), excluded from
//     the sweep until a payment method is configured.
//   - Failed payouts: retry is MANUAL (admin alerted) — the sweep only takes
//     batches with no previous payment attempts, preventing retry loops.
// ─────────────────────────────────────────────────────────────────────────────

import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { PaymentCategory, PaymentDirection } from '@/generated/prisma/client';
import type { GiftcardStatus } from '@/generated/prisma/enums';
import type { Decimal } from '@prisma/client/runtime/client';
import { canCancelBatch } from '@/lib/services/giftcard/batch-cancel.service';
import { getAutoPaySellers } from '@/lib/settings/settings.service';
import { executeSellerPayout } from './seller-payout.service';

// ── Types ────────────────────────────────────────────────────────────────────

interface AutoPayCandidate {
  batchId: number;
  sellerId: string | null;
  hasWallet: boolean;
}

export interface AutoPaySweepResult {
  processed: number;
  paid: number;
  failed: number;
}

// ── Eligibility ──────────────────────────────────────────────────────────────

const CARD_SELECT = { status: true, reportedAmount: true, isConfirmed: true } as const;

function isEligible(batch: {
  isPaid: boolean;
  cancelledAt: Date | null;
  giftcards: { status: GiftcardStatus; reportedAmount: Decimal | null; isConfirmed: boolean }[];
}): boolean {
  if (batch.isPaid || batch.cancelledAt) return false;
  if (batch.giftcards.length === 0) return false;
  if (!batch.giftcards.every((c) => c.isConfirmed)) return false;
  // payable = 0 → auto-cancel's territory, not ours
  if (canCancelBatch(batch.giftcards)) return false;
  return true;
}

/**
 * Finds batches touched by an order that became payable (fully confirmed,
 * payable > 0). Post-commit counterpart of autoCancelEligibleBatchesForOrder.
 */
async function findAutoPayableBatchesForOrder(orderId: string): Promise<AutoPayCandidate[]> {
  const distinctBatchIds = await prisma.$queryRaw<{ batchId: number }[]>`
    SELECT DISTINCT "batchId"
    FROM "giftcard"
    WHERE "orderId" = ${orderId} AND "batchId" IS NOT NULL
  `;

  if (distinctBatchIds.length === 0) return [];

  const candidates: AutoPayCandidate[] = [];

  for (const { batchId } of distinctBatchIds) {
    const batch = await prisma.giftcardBatch.findUnique({
      where: { id: batchId },
      select: {
        isPaid: true,
        cancelledAt: true,
        userId: true,
        user: { select: { paymentMethod: { select: { id: true } } } },
        giftcards: { select: CARD_SELECT },
      },
    });

    if (!batch || !isEligible(batch)) continue;

    candidates.push({
      batchId,
      sellerId: batch.userId,
      hasWallet: !!batch.user?.paymentMethod,
    });
  }

  return candidates;
}

// ── Processing ───────────────────────────────────────────────────────────────

/**
 * Processes one candidate: pays it, or holds it with notifications when the
 * seller has no payment method configured.
 */
async function processAutoPayCandidate(candidate: AutoPayCandidate): Promise<'PAID' | 'FAILED' | 'NO_WALLET'> {
  const { batchId, sellerId, hasWallet } = candidate;

  if (!hasWallet) {
    logger.warn('Auto-pay retenido: seller sin método de pago', {
      flow: 'payment',
      action: 'auto-pay',
      metadata: { batchId, sellerId },
    });

    const { notifySellerWalletRequired, notifyAdminPayoutFailed } = await import('@/lib/notifications');

    if (sellerId) {
      notifySellerWalletRequired(sellerId, batchId).catch((err) =>
        logger.error('Error notificando seller (wallet requerida)', {
          flow: 'payment',
          action: 'auto-pay',
          metadata: { batchId, sellerId },
          error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : String(err) },
        }),
      );
    }

    notifyAdminPayoutFailed(batchId, 0, 'El seller no tiene método de pago configurado — pago retenido hasta que lo configure.').catch((err) =>
      logger.error('Error notificando admin (seller sin wallet)', {
        flow: 'payment',
        action: 'auto-pay',
        metadata: { batchId, sellerId },
        error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : String(err) },
      }),
    );

    return 'NO_WALLET';
  }

  // executeSellerPayout alerts the admin on failure when source='auto'
  const result = await executeSellerPayout(batchId, 'auto');

  logger.info('Auto-pay ejecutado', {
    flow: 'payment',
    action: 'auto-pay',
    metadata: { batchId, sellerId, status: result.status, amount: result.amount, error: result.error },
  });

  return result.status === 'FAILED' ? 'FAILED' : 'PAID';
}

// ── Event Trigger ────────────────────────────────────────────────────────────

/**
 * Post-commit trigger called from the order lifecycle (confirmOrderUsage /
 * cancelOrder). No-op when auto_pay_sellers is disabled. Never throws.
 */
export async function triggerAutoPayForOrder(orderId: string): Promise<void> {
  try {
    const enabled = await getAutoPaySellers();
    if (!enabled) return;

    const candidates = await findAutoPayableBatchesForOrder(orderId);

    // Sequential — these are Binance API calls, not bulk DB work
    for (const candidate of candidates) {
      await processAutoPayCandidate(candidate);
    }
  } catch (error) {
    logger.error('Error en trigger de auto-pay', {
      flow: 'payment',
      action: 'auto-pay',
      metadata: { orderId },
      error: { name: (error as Error).name, message: (error as Error).message },
    });
  }
}

// ── Cron Sweep ───────────────────────────────────────────────────────────────

/**
 * Safety net: pays eligible batches that the event trigger missed (or whose
 * seller configured a wallet after being held).
 *
 * First attempts ONLY: batches with any previous payment attempt (even FAILED)
 * are excluded — failed payouts are retried manually from the admin UI.
 * Batches whose seller has no wallet are excluded; they enter automatically
 * once a payment method is configured.
 */
export async function sweepPayableBatches(): Promise<AutoPaySweepResult> {
  const result: AutoPaySweepResult = { processed: 0, paid: 0, failed: 0 };

  const batches = await prisma.giftcardBatch.findMany({
    where: {
      isPaid: false,
      cancelledAt: null,
      giftcards: { some: {} },
      user: { is: { paymentMethod: { isNot: null } } },
      payments: { none: { category: PaymentCategory.BATCH, direction: PaymentDirection.DEBIT } },
    },
    select: {
      id: true,
      userId: true,
      isPaid: true,
      cancelledAt: true,
      giftcards: { select: CARD_SELECT },
    },
  });

  for (const batch of batches) {
    if (!isEligible(batch)) continue;

    result.processed++;

    // hasWallet guaranteed by the query filter
    const outcome = await processAutoPayCandidate({ batchId: batch.id, sellerId: batch.userId, hasWallet: true });

    if (outcome === 'PAID') result.paid++;
    else if (outcome === 'FAILED') result.failed++;
  }

  if (result.processed > 0) {
    logger.info('Sweep de auto-pay completado', {
      flow: 'payment',
      action: 'auto-pay-sweep',
      metadata: { ...result },
    });
  }

  return result;
}
