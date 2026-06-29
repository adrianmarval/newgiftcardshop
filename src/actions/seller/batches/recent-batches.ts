'use server';

import prisma from '@/lib/prisma';
import { sellerActionClient, ActionError } from '@/lib/safe-action';
import { computeFaceValueTotal } from '@/lib/services/pricing';
import { recentBatchesOutputSchema } from './schemas';

export const recentBatches = sellerActionClient.outputSchema(recentBatchesOutputSchema).action(async ({ ctx }) => {
  try {
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

      const effectiveTotal = computeFaceValueTotal(batch.giftcards);

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
  } catch (error) {
    console.error('[recentBatches]', error);
    throw new ActionError('Error al obtener los lotes recientes.');
  }
});