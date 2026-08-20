'use server';

import prisma from '@/lib/prisma';
import { sellerActionClient, ActionError } from '@/lib/safe-action';
import { recentBatchesOutputSchema } from './schemas';

export const recentBatches = sellerActionClient.outputSchema(recentBatchesOutputSchema).action(async ({ ctx }) => {
  try {
    const userId = ctx.auth.user.id;

    const batches = await prisma.giftcardBatch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        _count: { select: { giftcards: true } },
        giftcards: {
          take: 2,
          include: { brandCountry: { include: { brand: true } } },
        },
      },
    });

    const batchIds = batches.map((b) => b.id);

    const [aggregates, confirmedAggregates] = await Promise.all([
      prisma.giftcard.groupBy({
        by: ['batchId'],
        where: { batchId: { in: batchIds } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.giftcard.groupBy({
        by: ['batchId'],
        where: { batchId: { in: batchIds }, isConfirmed: true },
        _count: { id: true },
      }),
    ]);

    const aggregateMap = new Map(aggregates.map((a) => [a.batchId, { totalFaceValue: Number(a._sum.amount ?? 0), totalCards: a._count.id }]));
    const confirmedMap = new Map(confirmedAggregates.map((a) => [a.batchId, a._count.id]));

    return batches.map((batch) => {
      const giftcards = batch.giftcards.map((card) => ({
        id: card.id,
        amount: Number(card.amount),
        brand: {
          name: card.brandCountry.brand.name,
          icon: card.brandCountry.brand.icon,
          image: card.brandCountry.brand.image,
        },
      }));

      const agg = aggregateMap.get(batch.id);
      const realCardsCount = agg?.totalCards ?? batch._count.giftcards;
      const effectiveTotal = (agg?.totalFaceValue ?? 0) * Number(batch.sellRate);
      const confirmedCount = confirmedMap.get(batch.id) ?? 0;

      return {
        id: batch.id,
        sellRate: Number(batch.sellRate),
        isPaid: batch.isPaid,
        cancelledAt: batch.cancelledAt?.toISOString() ?? null,
        createdAt: batch.createdAt.toISOString(),
        giftcards,
        cardsCount: realCardsCount,
        confirmedCount,
        effectiveTotal,
      };
    });
  } catch (error) {
    console.error('[recentBatches]', error);
    throw new ActionError('Error al obtener los lotes recientes.');
  }
});