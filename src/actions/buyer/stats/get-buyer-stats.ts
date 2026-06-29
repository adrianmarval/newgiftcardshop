'use server';

import { buyerActionClient, ActionError } from '@/lib/safe-action';
import prisma from '@/lib/prisma';
import { startOfDay } from 'date-fns';
import { maskEmail } from '@/lib/utils/mask-email';
import { AVAILABLE_GIFTCARD_WHERE } from '@/lib/constants';
import { buyerStatsOutputSchema } from './schemas';

const ORDER_BOOK_LIMIT = 10;

export const getBuyerStats = buyerActionClient.outputSchema(buyerStatsOutputSchema).action(async () => {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);

    const [available, todayOrders] = await Promise.all([
      prisma.giftcard.aggregate({
        where: AVAILABLE_GIFTCARD_WHERE,
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
  } catch (error) {
    console.error('[getBuyerStats]', error);
    throw new ActionError('Error al obtener las estadísticas.');
  }
});