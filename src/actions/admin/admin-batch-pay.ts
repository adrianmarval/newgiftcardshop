'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
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
        if (card.status === 'WRONG_AMOUNT') return sum.plus(card.reportedAmount ?? new Prisma.Decimal(0));
        if (card.status === 'USED' || card.status === 'UNUSED') return sum.plus(card.amount);
        return sum;
      }, new Prisma.Decimal(0));

      const paymentAmount = effectiveTotal.mul(batch.sellRate);

      const payment = await prisma.payment.create({
        data: {
          amount: paymentAmount,
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
