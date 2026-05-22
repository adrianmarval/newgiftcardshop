'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { buyerActionClient } from '@/lib/safe-action';

export const buyerStats = buyerActionClient.action(async ({ ctx }) => {
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
        return faceSum.plus(card.amount);
      }
      if (card.status === 'WRONG_AMOUNT') {
        return faceSum.plus(card.reportedAmount ?? new Prisma.Decimal(0));
      }
      return faceSum;
    }, new Prisma.Decimal(0));
    const effectiveTotal = faceValueTotal.mul(order.buyRate);
    return sum.plus(faceValueTotal.sub(effectiveTotal));
  }, new Prisma.Decimal(0));

  const activeOrders = activeOrdersResult;

  return {
    availableCards,
    myOrders,
    activeOrders,
    totalSaved: totalSaved.toNumber(),
  };
});
