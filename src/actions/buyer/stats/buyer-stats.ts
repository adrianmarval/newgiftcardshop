'use server';

import prisma from '@/lib/prisma';
import { buyerActionClient } from '@/lib/safe-action';
import { startOfDay } from 'date-fns';
import { maskEmail } from '@/lib/utils/mask-email';

const ORDER_BOOK_LIMIT = 10;

export const buyerStats = buyerActionClient.action(async () => {
  const now = new Date();
  const todayStart = startOfDay(now);

  const [available, todayOrders] = await Promise.all([
    prisma.giftcard.aggregate({
      where: { status: 'UNUSED', inStock: true },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: todayStart } },
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        user: { select: { email: true } },
        giftcards: { select: { amount: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: ORDER_BOOK_LIMIT,
    }),
  ]);

  const totalTradedToday = todayOrders.reduce(
    (sum, order) => sum + order.giftcards.reduce((s, gc) => s + gc.amount.toNumber(), 0),
    0,
  );

  return {
    availableCards: available._count,
    availableAmount: available._sum.amount?.toNumber() ?? 0,
    orderBook: {
      totalOrdersToday: todayOrders.length,
      totalTradedToday,
      entries: todayOrders.map((order) => ({
        orderId: order.id,
        buyerEmail: maskEmail(order.user.email),
        cardCount: order.giftcards.length,
        total: order.total.toNumber(),
        status: order.status,
        createdAt: order.createdAt.toISOString(),
      })),
    },
  };
});
