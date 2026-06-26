'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { notifySellerBatchPaid } from '@/lib/notifications';
import { computeFaceValueTotal } from '@/lib/services/pricing/pricing';

const payBatchInputSchema = z.object({ batchIds: z.array(z.number().int().positive()) });

const payBatchOutputSchema = z.object({
  success: z.literal(true),
  results: z.array(z.object({ batchId: z.number(), paymentId: z.string(), amount: z.number() })),
});

export const payBatch = adminActionClient.inputSchema(payBatchInputSchema).outputSchema(payBatchOutputSchema).action(async ({ parsedInput }) => {
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

    // ── Transacción de pago (actualmente deshabilitada — desconmentar cuando se valide el flujo)
    // const payment = await prisma.$transaction(async (tx) => {
    //   const updatedSettings = await tx.platformSettings.update({
    //     where: { key: SETTING_KEYS.PLATFORM_BALANCE },
    //     data: { balance: { decrement: paymentAmount } },
    //   });
    //
    //   const payment = await tx.payment.create({
    //     data: {
    //       amount: paymentAmount,
    //       balanceAfter: updatedSettings.balance,
    //       direction: 'DEBIT',
    //       category: 'BATCH',
    //       batchId: batch.id,
    //       relatedUserId: batch.user?.id ?? null,
    //     },
    //   });
    //
    //   await tx.giftcardBatch.update({
    //     where: { id: batchId },
    //     data: { isPaid: true },
    //   });
    //
    //   results.push({
    //     batchId,
    //     paymentId: payment.id,
    //     amount: Number(payment.amount),
    //   });
    // });

    // ── Hook de notificación al seller ───────────────────────────────────────
    // Cuando la tx se desconmente y results se popule, este bloque ya funcionará sin cambios.
    if (batch.user?.id) {
      notifySellerBatchPaid(batch.user.id, batchId, Number(paymentAmount))
        .catch((err) => console.error('[pay-batch] Error al notificar seller (non-blocking):', err));
    }
  }

  return { success: true as const, results };
});
