'use server';

import prisma from '@/lib/prisma';
import { adminActionClient, ActionError } from '@/lib/safe-action';
import { notifySellerBatchPaid } from '@/lib/notifications';
import { computeFaceValueTotal } from '@/lib/services/pricing';
import { logger } from '@/lib/logger';
import { payBatchInputSchema, payBatchOutputSchema } from './schemas';

export const payBatch = adminActionClient
  .inputSchema(payBatchInputSchema)
  .outputSchema(payBatchOutputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { batchIds } = parsedInput;

      const results: { batchId: number; paymentId: string; amount: number }[] = [];

      for (const batchId of batchIds) {
        const batch = await prisma.giftcardBatch.findUnique({
          where: { id: batchId },
          include: {
            giftcards: true,
            user: { select: { id: true } },
          },
        });

        if (!batch) continue;

        const isPayable = batch.giftcards.every((g) => g.isConfirmed) && batch.giftcards.length > 0 && !batch.isPaid;

        if (!isPayable) continue;

        const effectiveTotal = computeFaceValueTotal(batch.giftcards);

        const paymentAmount = effectiveTotal.mul(batch.sellRate);

        // TODO: Payment transaction disabled intentionally — uncomment when payment flow is validated.
        // The notification below won't fire until results is populated by the transaction.

        if (batch.user?.id) {
          notifySellerBatchPaid(batch.user.id, batchId, Number(paymentAmount))
            .catch((err) => console.error('[pay-batch] Error al notificar seller (non-blocking):', err));
        }
      }

      return { success: true as const, results };
    } catch (error) {
      logger.error('Error al pagar lotes', {
        error: {
          name: error instanceof Error ? error.name : 'Error',
          message: error instanceof Error ? error.message : 'Unknown',
        },
      });
      throw new ActionError('Error al procesar el pago de lotes.');
    }
  });