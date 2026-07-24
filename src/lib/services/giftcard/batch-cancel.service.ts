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

class BatchCancelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BatchCancelError';
  }
}
