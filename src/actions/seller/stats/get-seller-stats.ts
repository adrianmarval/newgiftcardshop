'use server';

import { Prisma } from '@/generated/prisma/client';
import { GiftcardStatus } from '@/generated/prisma/enums';
import { sellerActionClient, ActionError } from '@/lib/safe-action';
import prisma from '@/lib/prisma';
import { sellerStatsOutputSchema } from './schemas';

const PROBLEM_STATUSES = [GiftcardStatus.INVALID, GiftcardStatus.ALREADY_USED, GiftcardStatus.WRONG_AMOUNT, GiftcardStatus.DEACTIVATED] as const;

export const getSellerStats = sellerActionClient.outputSchema(sellerStatsOutputSchema).action(async ({ ctx }) => {
  try {
    const userId = ctx.auth.user.id;

    // Fetch batches with sellRate for pending (unpaid) and earned (paid)
    const [unpaidBatches, paidBatches, problemCards] = await Promise.all([
      prisma.giftcardBatch.findMany({
        where: { userId, isPaid: false },
        select: { id: true, sellRate: true },
      }),
      prisma.giftcardBatch.findMany({
        where: { userId, isPaid: true },
        select: { id: true, sellRate: true },
      }),
      prisma.giftcard.count({
        where: { batch: { userId }, status: { in: [...PROBLEM_STATUSES] } },
      }),
    ]);

    // Group face values per batch for unpaid and paid
    const [unpaidFaceValues, paidFaceValues] = await Promise.all([
      prisma.giftcard.groupBy({
        by: ['batchId'],
        where: { batchId: { in: unpaidBatches.map((b) => b.id) } },
        _sum: { amount: true },
      }),
      prisma.giftcard.groupBy({
        by: ['batchId'],
        where: { batchId: { in: paidBatches.map((b) => b.id) } },
        _sum: { amount: true },
      }),
    ]);

    const unpaidFaceMap = new Map(unpaidFaceValues.map((a) => [a.batchId, a._sum.amount ?? new Prisma.Decimal(0)]));
    const paidFaceMap = new Map(paidFaceValues.map((a) => [a.batchId, a._sum.amount ?? new Prisma.Decimal(0)]));

    // Pending payout: Σ(batch face value × batch sellRate) for unpaid batches
    const pendingPayout = unpaidBatches.reduce((sum, b) => {
      const faceValue = unpaidFaceMap.get(b.id) ?? new Prisma.Decimal(0);
      return sum.plus(faceValue.mul(b.sellRate));
    }, new Prisma.Decimal(0));

    // Total earned: Σ(batch face value × batch sellRate) for paid batches
    const totalEarned = paidBatches.reduce((sum, b) => {
      const faceValue = paidFaceMap.get(b.id) ?? new Prisma.Decimal(0);
      return sum.plus(faceValue.mul(b.sellRate));
    }, new Prisma.Decimal(0));

    // In-stock value: each in-stock card × its batch sellRate
    const inStockCards = await prisma.giftcard.findMany({
      where: { batch: { userId }, inStock: true, status: GiftcardStatus.UNUSED },
      select: { amount: true, batchId: true },
    });

    const inStockBatchIds = [...new Set(inStockCards.map((c) => c.batchId).filter(Boolean))] as number[];
    const inStockBatchRates = await prisma.giftcardBatch.findMany({
      where: { id: { in: inStockBatchIds } },
      select: { id: true, sellRate: true },
    });
    const inStockRateMap = new Map(inStockBatchRates.map((b) => [b.id, b.sellRate]));

    const inStockValue = inStockCards.reduce((sum, card) => {
      const rate = inStockRateMap.get(card.batchId!) ?? new Prisma.Decimal(0);
      return sum.plus(card.amount.mul(rate));
    }, new Prisma.Decimal(0));

    return {
      pendingPayout: Number(pendingPayout),
      totalEarned: Number(totalEarned),
      inStockValue: Number(inStockValue),
      problemCards,
    };
  } catch (error) {
    console.error('[getSellerStats]', error);
    throw new ActionError('Error al obtener las estadísticas.');
  }
});
