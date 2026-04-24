'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { payBatchesInputSchema, payBatchesOutputSchema } from '@/types/domain/admin';

export const adminBatchPay = adminActionClient
  .inputSchema(payBatchesInputSchema)
  .outputSchema(payBatchesOutputSchema)
  .action(async ({ parsedInput }) => {
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

      const effectiveTotal = batch.giftcards.reduce((sum, card) => {
        if (card.status === 'WRONG_AMOUNT') return sum + Number(card.reportedAmount ?? 0);
        if (card.status === 'USED' || card.status === 'UNUSED') return sum + Number(card.amount);
        return sum;
      }, 0);

      const payment = await prisma.payment.create({
        data: {
          amount: effectiveTotal * Number(batch.sellRate),
          balanceAfter: 0,
          status: 'COMPLETED',
          transactionType: 'CREDIT',
          batchId: batch.id,
        },
      });

      await prisma.giftcardBatch.update({
        where: { id: batchId },
        data: { isPaid: true },
      });

      results.push({
        batchId,
        paymentId: payment.id,
        amount: Number(payment.amount),
      });
    }

    return { success: true, results };
  });
