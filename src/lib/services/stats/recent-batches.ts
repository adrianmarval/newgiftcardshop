import prisma from '@/lib/prisma';
import { computeFaceValueTotal } from '@/lib/services/pricing';

export async function getRecentBatches(userId: string) {
  const batches = await prisma.giftcardBatch.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      _count: { select: { giftcards: true } },
      giftcards: {
        take: 2,
        include: { brandCountry: { include: { brand: true } } },
      },
    },
  });

  const batchIds = batches.map((b) => b.id);

  // Status-aware per-batch aggregation (face value respects issue adjustments)
  const batchCards = await prisma.giftcard.findMany({
    where: { batchId: { in: batchIds } },
    select: { batchId: true, status: true, amount: true, reportedAmount: true, isConfirmed: true },
  });

  const cardsByBatch = new Map<number, typeof batchCards>();
  for (const card of batchCards) {
    if (card.batchId === null) continue;
    const list = cardsByBatch.get(card.batchId) ?? [];
    list.push(card);
    cardsByBatch.set(card.batchId, list);
  }

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

    const cards = cardsByBatch.get(batch.id) ?? [];
    const realCardsCount = cards.length || batch._count.giftcards;
    const confirmedCount = cards.filter((c) => c.isConfirmed).length;
    // Face value (status-aware, no rate) — matches effectiveTotal in batch-list.service
    const effectiveTotal = computeFaceValueTotal(cards).toNumber();

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
}
