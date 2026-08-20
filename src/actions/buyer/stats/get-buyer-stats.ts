'use server';

import { buyerActionClient, ActionError } from '@/lib/safe-action';
import prisma from '@/lib/prisma';
import { startOfDay, startOfMonth } from 'date-fns';
import { maskEmail } from '@/lib/utils/mask-email';
import { AVAILABLE_GIFTCARD_WHERE } from '@/lib/constants';
import { buyerStatsOutputSchema } from './schemas';

const ORDER_BOOK_LIMIT = 10;

export const getBuyerStats = buyerActionClient.outputSchema(buyerStatsOutputSchema).action(async ({ ctx }) => {
  try {
    const userId = ctx.auth.user.id;
    const now = new Date();
    const todayStart = startOfDay(now);
    const monthStart = startOfMonth(now);

    const [available, todayOrders, user, unpaidOrders, completedOrders, monthOrders, reportedIssues] = await Promise.all([
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
      prisma.user.findUnique({
        where: { id: userId },
        select: { creditLimit: true },
      }),
      prisma.order.findMany({
        where: { userId, status: { in: ['PENDING', 'AWAITING_PAYMENT'] } },
        select: { adjustedTotal: true, total: true },
      }),
      prisma.order.findMany({
        where: { userId, status: 'COMPLETED' },
        select: { id: true, total: true, adjustedTotal: true },
      }),
      prisma.order.findMany({
        where: { userId, status: 'COMPLETED', createdAt: { gte: monthStart } },
        select: { id: true, adjustedTotal: true, total: true },
      }),
      prisma.giftcardIssue.count({
        where: { reportedById: userId },
      }),
    ]);

    const totalTradedToday = todayOrders.reduce(
      (sum, order) => sum + order.giftcards.reduce((s, gc) => s + gc.amount.toNumber(), 0),
      0,
    );

    // Compute total saved: face value - paid across all completed orders
    let totalSaved = 0;
    if (completedOrders.length > 0) {
      const completedOrderIds = completedOrders.map((o) => o.id);
      const faceValues = await prisma.giftcard.groupBy({
        by: ['orderId'],
        where: { orderId: { in: completedOrderIds } },
        _sum: { amount: true },
      });
      const faceValueMap = new Map(faceValues.map((a) => [a.orderId, Number(a._sum.amount ?? 0)]));

      for (const order of completedOrders) {
        const faceValue = faceValueMap.get(order.id) ?? 0;
        const paid = Number(order.adjustedTotal ?? order.total);
        totalSaved += faceValue - paid;
      }
    }

    // Month spend
    const monthSpend = monthOrders.reduce((sum, o) => sum + Number(o.adjustedTotal ?? o.total), 0);

    const creditLimit = user?.creditLimit ? Number(user.creditLimit) : 0;
    const unpaidTotal = unpaidOrders.reduce((sum, o) => sum + Number(o.adjustedTotal ?? o.total), 0);

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
      personal: {
        creditLimit,
        unpaidTotal,
        availableCredit: creditLimit - unpaidTotal,
        pendingOrdersCount: unpaidOrders.length,
        totalSaved: Math.max(totalSaved, 0),
        monthSpend,
        monthOrdersCount: monthOrders.length,
        reportedIssues,
      },
    };
  } catch (error) {
    console.error('[getBuyerStats]', error);
    throw new ActionError('Error al obtener las estadísticas.');
  }
});
