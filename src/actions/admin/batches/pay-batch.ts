'use server';

import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';

const payBatchInputSchema = z.object({ batchIds: z.array(z.number().int().positive()) });

export const payBatch = adminActionClient.inputSchema(payBatchInputSchema).action(async ({ parsedInput }) => {
  const { batchIds } = parsedInput;

  const results: { batchId: number; paymentId: string; amount: number }[] = [];

  const lastPayment = await prisma.payment.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { balanceAfter: true },
  });
  let currentBalance = lastPayment ? Number(lastPayment.balanceAfter) : 0;

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

    const newBalance = currentBalance - Number(paymentAmount);
    currentBalance = newBalance;

    const payment = await prisma.payment.create({
      data: {
        amount: paymentAmount,
        balanceAfter: newBalance,
        direction: 'DEBIT',
        category: 'BATCH',
        batchId: batch.id,
        relatedUserId: batch.user?.id ?? null,
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

  return { success: true as const, results };
});
