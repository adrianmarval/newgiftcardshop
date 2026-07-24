'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import prisma from '@/lib/prisma';
import { cancelBatch, canCancelBatch } from '@/lib/services/giftcard/batch-cancel.service';
import { logger } from '@/lib/logger';
import { cancelBatchInputSchema, cancelBatchOutputSchema } from './schemas';

export const cancelBatchAction = adminActionClient
  .inputSchema(cancelBatchInputSchema)
  .outputSchema(cancelBatchOutputSchema)
  .action(async ({ parsedInput }) => {
    const { batchId } = parsedInput;

    const batch = await prisma.giftcardBatch.findUnique({
      where: { id: batchId },
      include: {
        giftcards: {
          select: { status: true, reportedAmount: true },
        },
      },
    });

    if (!batch) {
      throw new ActionError('Lote no encontrado.');
    }

    if (batch.isPaid) {
      throw new ActionError('No se puede cancelar un lote que ya fue pagado.');
    }

    if (batch.cancelledAt) {
      throw new ActionError('Este lote ya fue cancelado.');
    }

    if (!canCancelBatch(batch.giftcards)) {
      throw new ActionError('No se puede cancelar: el lote contiene tarjetas activas con saldo.');
    }

    try {
      await cancelBatch(batchId);

      // Notify seller
      if (batch.userId) {
        const { notifySellerBatchCancelled } = await import('@/lib/notifications/notification.service');
        notifySellerBatchCancelled(batch.userId, batchId).catch((err) =>
          logger.error('Error notificando seller post-cancel', {
            flow: 'batch',
            action: 'cancel-batch',
            metadata: { userId: batch.userId, batchId },
            error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : String(err) },
          }),
        );
      }

      return {
        success: true as const,
        message: `Lote #${batchId} cancelado con éxito.`,
      };
    } catch (error) {
      if (error instanceof ActionError) throw error;
      logger.error('Error cancelando lote', {
        flow: 'batch',
        action: 'cancel-batch',
        metadata: { batchId },
        error: { name: (error as Error).name, message: (error as Error).message },
      });
      throw new ActionError('Error interno al cancelar el lote.');
    }
  });
