'use server';

import prisma from '@/lib/prisma';
import { buyerActionClient } from '@/lib/safe-action';
import { buyerStatsSchema } from '@/types/domain/order';

export const buyerStats = buyerActionClient.outputSchema(buyerStatsSchema).action(async ({ ctx }) => {
  const userId = ctx.auth.user.id;

  const availableCards = await prisma.giftcard.count({
    where: { status: 'UNUSED', inStock: true },
  });
  const myOrders = await prisma.order.count({
    where: { userId },
  });
  const activeOrdersResult = await prisma.order.count({
    where: {
      userId,
      status: { in: ['PENDING', 'AWAITING_PAYMENT'] },
    },
  });

  const completedOrders = await prisma.order.findMany({
    where: { userId, status: 'COMPLETED' },
    include: { giftcards: true },
  });

  const totalSaved = completedOrders.reduce((sum, order) => {
    const faceValueTotal = order.giftcards.reduce((faceSum, card) => {
      if (card.status === 'UNUSED' || card.status === 'USED') {
        return faceSum + Number(card.amount);
      }
      if (card.status === 'WRONG_AMOUNT') {
        return faceSum + Number(card.reportedAmount ?? 0);
      }
      return faceSum;
    }, 0);
    const effectiveTotal = faceValueTotal * Number(order.buyRate);
    return sum + (faceValueTotal - effectiveTotal);
  }, 0);

  const activeOrders = activeOrdersResult;

  return {
    availableCards,
    myOrders,
    activeOrders,
    totalSaved: Math.round(totalSaved * 100) / 100,
  };
});
