'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { adminActionClient, ActionError } from '@/lib/safe-action';
import { notifySellerBatchPaid } from '@/lib/notifications';
import { computeFaceValueTotal } from '@/lib/services/pricing';

const payBatchInputSchema = z.object({ batchIds: z.array(z.number().int().positive()) });

const payBatchOutputSchema = z.object({
  success: z.literal(true),
  results: z.array(z.object({ batchId: z.number(), paymentId: z.string(), amount: z.number() })),
});

export const payBatch = adminActionClient.inputSchema(payBatchInputSchema).outputSchema(payBatchOutputSchema).action(async ({ parsedInput }) => {
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

      // ── Hook de notificación al seller ───────────────────────────────────────
      if (batch.user?.id) {
        notifySellerBatchPaid(batch.user.id, batchId, Number(paymentAmount))
          .catch((err) => console.error('[pay-batch] Error al notificar seller (non-blocking):', err));
      }
    }

    return { success: true as const, results };
  } catch (error) {
    console.error('[payBatch]', error);
    throw new ActionError('Error al procesar el pago de lotes.');
  }
});
