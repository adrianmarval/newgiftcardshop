import { Prisma } from '@/generated/prisma/client';
import { GiftcardStatus } from '@/generated/prisma/enums';
import { Decimal } from '@prisma/client/runtime/client';
import { computeFaceValueTotal } from '@/lib/services/pricing';
import prisma from '@/lib/prisma';

const PROBLEM_STATUSES = [GiftcardStatus.INVALID, GiftcardStatus.ALREADY_USED, GiftcardStatus.WRONG_AMOUNT, GiftcardStatus.DEACTIVATED] as const;

export async function getSellerStats(userId: string) {
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
}

/**
 * Stats para el seller-bot (comando /stats). Mismas reglas que getSellerStats
 * (status-aware face value × sellRate por batch, espejo de executeSellerPayout)
 * pero con agregados SQL para counts/face values — NUNCA cargar todas las
 * giftcards del seller en memoria (la versión vieja del handler hacía un
 * findMany sin take y no escalaba).
 */
export async function getSellerBotStats(userId: string) {
  const cardSelect = { status: true, amount: true, reportedAmount: true, inStock: true } as const;

  const [batchCount, paidBatchCount, totalCards, inStockCards, faceAgg, faceSoldAgg, unpaidBatches, paidBatches] =
    await Promise.all([
      prisma.giftcardBatch.count({ where: { userId } }),
      prisma.giftcardBatch.count({ where: { userId, isPaid: true } }),
      prisma.giftcard.count({ where: { ownerId: userId } }),
      prisma.giftcard.count({ where: { ownerId: userId, inStock: true } }),
      prisma.giftcard.aggregate({ where: { ownerId: userId }, _sum: { amount: true } }),
      prisma.giftcard.aggregate({ where: { ownerId: userId, inStock: false }, _sum: { amount: true } }),
      prisma.giftcardBatch.findMany({
        where: { userId, isPaid: false, cancelledAt: null },
        select: { sellRate: true, giftcards: { select: cardSelect } },
      }),
      prisma.giftcardBatch.findMany({
        where: { userId, isPaid: true },
        select: { sellRate: true, giftcards: { select: cardSelect } },
      }),
    ]);

  // Solo cuentan las cards vendidas (!inStock): el payout real se ejecuta con
  // el batch fully-confirmed, pero para display el seller entiende "vendido".
  const soldOnly = (batches: typeof paidBatches) =>
    batches.reduce((sum, b) => {
      const sold = b.giftcards.filter((c) => !c.inStock);
      return sum.plus(computeFaceValueTotal(sold).mul(b.sellRate));
    }, new Prisma.Decimal(0));

  return {
    batchCount,
    paidBatchCount,
    totalCards,
    inStockCards,
    soldCards: totalCards - inStockCards,
    faceValueTotal: Number(faceAgg._sum.amount ?? 0),
    faceValueSold: Number(faceSoldAgg._sum.amount ?? 0),
    earnedPaid: Number(soldOnly(paidBatches)),
    earnedPending: Number(soldOnly(unpaidBatches)),
  };
}
