'use server';

import prisma from '@/lib/prisma';
import { sellerActionClient } from '@/lib/safe-action';
import { sellerStatsSchema } from '@/types/domain/seller';

export const sellerStats = sellerActionClient.outputSchema(sellerStatsSchema).action(async ({ ctx }) => {
  const userId = ctx.auth.user.id;

  const [totalCards, totalBatches, paidBatches, unpaidBatches] = await prisma.$transaction([
    prisma.giftcard.count({
      where: {
        batch: { userId },
      },
    }),
    prisma.giftcardBatch.count({
      where: { userId },
    }),
    prisma.giftcardBatch.count({
      where: { userId, isPaid: true },
    }),
    prisma.giftcardBatch.count({
      where: { userId, isPaid: false },
    }),
  ]);

  return {
    totalCards,
    totalBatches,
    paidBatches,
    unpaidBatches,
  };
});
