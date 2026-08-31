'use server';

import { Prisma } from '@/generated/prisma/client';
import { GiftcardStatus } from '@/generated/prisma/enums';
import { Decimal } from '@prisma/client/runtime/client';
import { sellerActionClient, ActionError } from '@/lib/safe-action';
import { computeFaceValueTotal } from '@/lib/services/pricing';
import prisma from '@/lib/prisma';
import { sellerStatsOutputSchema } from './schemas';

const PROBLEM_STATUSES = [GiftcardStatus.INVALID, GiftcardStatus.ALREADY_USED, GiftcardStatus.WRONG_AMOUNT, GiftcardStatus.DEACTIVATED] as const;

export const getSellerStats = sellerActionClient.outputSchema(sellerStatsOutputSchema).action(async ({ ctx }) => {
  try {
    const userId = ctx.auth.user.id;

    const giftcardSelect = { status: true, amount: true, reportedAmount: true } as const;

    // Fetch batches with their giftcards for pending (unpaid, not cancelled) and earned (paid)
    const [unpaidBatches, paidBatches, problemCards, inStockAggregate] = await Promise.all([
      prisma.giftcardBatch.findMany({
        where: { userId, isPaid: false, cancelledAt: null },
        select: { sellRate: true, giftcards: { select: giftcardSelect } },
      }),
      prisma.giftcardBatch.findMany({
        where: { userId, isPaid: true },
        select: { sellRate: true, giftcards: { select: giftcardSelect } },
      }),
      prisma.giftcard.count({
        where: { batch: { userId }, status: { in: [...PROBLEM_STATUSES] } },
      }),
      // In-stock value: face value (nominal amount) of unsold cards
      prisma.giftcard.aggregate({
        where: { batch: { userId }, inStock: true, status: GiftcardStatus.UNUSED },
        _sum: { amount: true },
      }),
    ]);

    // Pending payout: mirrors executeSellerPayout — Σ(status-aware face value × sellRate, 2dp) per batch
    const pendingPayout = unpaidBatches.reduce((sum, b) => {
      const batchPayout = computeFaceValueTotal(b.giftcards).mul(b.sellRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      return sum.plus(batchPayout);
    }, new Prisma.Decimal(0));

    // Total earned: Σ(status-aware face value × batch sellRate) for paid batches
    const totalEarned = paidBatches.reduce((sum, b) => {
      return sum.plus(computeFaceValueTotal(b.giftcards).mul(b.sellRate));
    }, new Prisma.Decimal(0));

    return {
      pendingPayout: Number(pendingPayout),
      totalEarned: Number(totalEarned),
      inStockValue: Number(inStockAggregate._sum.amount ?? 0),
      problemCards,
    };
  } catch (error) {
    console.error('[getSellerStats]', error);
    throw new ActionError('Error al obtener las estadísticas.');
  }
});
