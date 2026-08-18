'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { logger } from '@/lib/logger';
import { deleteBatchInputSchema, deleteBatchOutputSchema } from './schemas';

export const deleteBatch = adminActionClient
  .inputSchema(deleteBatchInputSchema)
  .outputSchema(deleteBatchOutputSchema)
  .action(async ({ parsedInput }) => {
    const { batchId } = parsedInput;

    const batch = await prisma.giftcardBatch.findUnique({
      where: { id: batchId },
      select: {
        userId: true,
        giftcards: { select: { orderId: true } },
      },
    });

    if (!batch) {
      return { success: false as const, error: 'Batch not found' };
    }

    const hasOrders = batch.giftcards.some((c) => c.orderId !== null);
    if (hasOrders) {
      return { success: false as const, error: 'Cannot delete batch with cards that have orders' };
    }

    await prisma.giftcard.deleteMany({ where: { batchId } });
    await prisma.giftcardBatch.delete({ where: { id: batchId } });

    if (batch.userId) {
      const { notifySellerBatchDeleted } = await import('@/lib/notifications/notification.service');
      notifySellerBatchDeleted(batch.userId, batchId).catch((err) =>
        logger.error('Error notificando seller post-delete', {
          flow: 'batch',
          action: 'delete-batch',
          metadata: { userId: batch.userId, batchId },
          error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : String(err) },
        }),
      );
    }

    return { success: true as const };
  });