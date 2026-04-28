'use server';

import prisma from '@/lib/prisma';
import { sellerActionClient } from '@/lib/safe-action';
import { sellerStatsSchema } from '@/types/domain/seller';

export const sellerStats = sellerActionClient.outputSchema(sellerStatsSchema).action(async ({ ctx }) => {
  const userId = ctx.auth.user.id;

  const totalCards = await prisma.giftcard.count({
    where: {
      batch: { userId },
    },
  });
  const totalBatches = await prisma.giftcardBatch.count({
    where: { userId },
  });
  const paidBatches = await prisma.giftcardBatch.count({
    where: { userId, isPaid: true },
  });
  const unpaidBatches = await prisma.giftcardBatch.count({
    where: { userId, isPaid: false },
  });

  return {
    totalCards,
    totalBatches,
    paidBatches,
    unpaidBatches,
  };
});
