'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { decrypt } from '@/lib/encryption';
import { sellerActionClient } from '@/lib/safe-action';
import { recentBatchSchema } from '@/types/domain/seller';

export const recentBatches = sellerActionClient.outputSchema(recentBatchSchema.array()).action(async ({ ctx }) => {
  const userId = ctx.auth.user.id;

  const batches = await prisma.giftcardBatch.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: {
      giftcards: {
        take: 2,
        include: { brandCountry: { include: { brand: true } } },
      },
    },
  });

  return batches.map((batch) => {
    const giftcards = batch.giftcards.map((card) => {
      let claimCode = card.claimCode;
      try {
        claimCode = decrypt(card.claimCode);
      } catch {
        /* legacy unencrypted */
      }
      return {
        id: card.id,
        amount: Number(card.amount),
        brand: {
          name: card.brandCountry.brand.name,
          icon: card.brandCountry.brand.icon,
          image: card.brandCountry.brand.image,
        },
      };
    });

    const effectiveTotal = batch.giftcards.reduce((sum, card) => {
      if (card.status === 'WRONG_AMOUNT') return sum.plus(card.reportedAmount ?? new Prisma.Decimal(0));
      return sum.plus(card.amount);
    }, new Prisma.Decimal(0));

    return {
      id: batch.id,
      sellRate: Number(batch.sellRate),
      isPaid: batch.isPaid,
      createdAt: batch.createdAt.toISOString(),
      giftcards,
      cardsCount: batch.giftcards.length,
      effectiveTotal: effectiveTotal.toNumber(),
    };
  });
});
