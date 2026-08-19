import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { GiftcardStatus } from '@/generated/prisma/enums';
import type { Prisma } from '@/generated/prisma/client';

/**
 * Checks if a batch can be cancelled (no active cards with value).
 * Mirror of canCancelOrder for batches.
 */
export function canCancelBatch(giftcards: { status: GiftcardStatus; reportedAmount: Prisma.Decimal | null }[]): boolean {
  return !giftcards.some((g) => {
    if (g.status === 'UNUSED' || g.status === 'USED') return true;
    if (g.status === 'WRONG_AMOUNT' && g.reportedAmount && g.reportedAmount.toNumber() > 0) return true;
    return false;
  });
}

/**
 * Cancels a batch by setting cancelledAt timestamp.
 * Only batches that are not paid and not already cancelled can be cancelled.
 */
export async function cancelBatch(batchId: number): Promise<void> {
  const batch = await prisma.giftcardBatch.findUnique({
    where: { id: batchId },
    select: { isPaid: true, cancelledAt: true },
  });

  if (!batch) {
    throw new BatchCancelError(`Lote #${batchId} no encontrado.`);
  }

  if (batch.isPaid) {
    throw new BatchCancelError(`Lote #${batchId} ya fue pagado — no se puede cancelar.`);
  }

  if (batch.cancelledAt) {
    throw new BatchCancelError(`Lote #${batchId} ya fue cancelado.`);
  }

  try {
    await prisma.giftcardBatch.update({
      where: { id: batchId },
      data: { cancelledAt: new Date() },
    });
  } catch (error) {
    logger.error('Error cancelando lote', {
      flow: 'batch',
      action: 'cancel-batch',
      metadata: { batchId },
      error: { name: (error as Error).name, message: (error as Error).message },
    });
    throw new BatchCancelError('Error interno al cancelar el lote.');
  }
}

// ── Auto-Cancel Helpers ──────────────────────────────────────────────────────

interface AutoCancelCandidate {
  batchId: number;
  sellerId: string;
}

/**
 * Atomically cancels batches whose payable amount is zero and all giftcards
 * are confirmed (statuses final). Called inside order lifecycle transactions
 * after all card statuses have been set to isConfirmed.
 *
 * Guards: batch not paid, not cancelled, all cards isConfirmed, canCancelBatch.
 * Uses guarded updateMany (where cancelledAt null) to race safely against
 * concurrent manual cancels or payouts.
 *
 * Returns cancelled batch IDs + seller IDs for post-commit notifications.
 */
export async function autoCancelEligibleBatchesForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<AutoCancelCandidate[]> {
  const distinctBatchIds = await tx.$queryRaw<{ batchId: number }[]>`
    SELECT DISTINCT "batchId"
    FROM "giftcard"
    WHERE "orderId" = ${orderId} AND "batchId" IS NOT NULL
  `;

  if (distinctBatchIds.length === 0) return [];

  const cancelled: AutoCancelCandidate[] = [];

  for (const { batchId } of distinctBatchIds) {
    const batch = await tx.giftcardBatch.findUnique({
      where: { id: batchId },
      select: { isPaid: true, cancelledAt: true },
    });

    if (!batch || batch.isPaid || batch.cancelledAt) continue;

    const cards = await tx.giftcard.findMany({
      where: { batchId },
      select: { status: true, reportedAmount: true, isConfirmed: true },
    });

    if (cards.length === 0) continue;
    if (!cards.every((c) => c.isConfirmed)) continue;
    if (!canCancelBatch(cards)) continue;

    const now = new Date();
    const { count } = await tx.giftcardBatch.updateMany({
      where: { id: batchId, isPaid: false, cancelledAt: null },
      data: { cancelledAt: now },
    });

    if (count > 0) {
      const batchFull = await tx.giftcardBatch.findUnique({
        where: { id: batchId },
        select: { userId: true },
      });
      cancelled.push({ batchId, sellerId: batchFull?.userId ?? '' });
    }
  }

  return cancelled;
}

/**
 * Cron sweep: finds batches eligible for cancellation (isPaid false, no cards
 * with active value, all cards confirmed) and cancels them. Safety net for
 * the event-driven auto-cancel in order lifecycle.
 */
export async function sweepCancellableBatches(): Promise<AutoCancelCandidate[]> {
  const candidates = await prisma.giftcardBatch.findMany({
    where: {
      isPaid: false,
      cancelledAt: null,
      giftcards: { some: {} },
    },
    include: {
      giftcards: {
        select: { status: true, reportedAmount: true, isConfirmed: true, amount: true },
      },
    },
  });

  const cancelled: AutoCancelCandidate[] = [];

  for (const batch of candidates) {
    if (!batch.giftcards.every((c) => c.isConfirmed)) continue;
    if (!canCancelBatch(batch.giftcards)) continue;

    const now = new Date();
    const { count } = await prisma.giftcardBatch.updateMany({
      where: { id: batch.id, isPaid: false, cancelledAt: null },
      data: { cancelledAt: now },
    });

    if (count > 0) {
      cancelled.push({ batchId: batch.id, sellerId: batch.userId ?? '' });
    }
  }

  return cancelled;
}

class BatchCancelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BatchCancelError';
  }
}
