'use server';

import { buyerActionClient, ActionError } from '@/lib/safe-action';
import prisma from '@/lib/prisma';
import { startOfDay, startOfMonth } from 'date-fns';
import { maskEmail } from '@/lib/utils/mask-email';
import { AVAILABLE_GIFTCARD_WHERE } from '@/lib/constants';
import { computeFaceValueTotal } from '@/lib/services/pricing';
import { buyerStatsOutputSchema } from './schemas';

const ORDER_BOOK_LIMIT = 10;

export const getBuyerStats = buyerActionClient.outputSchema(buyerStatsOutputSchema).action(async ({ ctx }) => {
  try {
    const userId = ctx.auth.user.id;
    const now = new Date();
    const todayStart = startOfDay(now);
    const monthStart = startOfMonth(now);

    const [available, todayOrders, todayOrderCount, user, unpaidOrders, completedOrders, monthOrders, reportedIssues] = await Promise.all([
      prisma.giftcard.aggregate({
        where: AVAILABLE_GIFTCARD_WHERE,
        _count: true,
        _sum: { amount: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: todayStart }, status: { not: 'CANCELLED' } },
        select: {
          id: true,
          total: true,
          status: true,
          createdAt: true,
          user: { select: { email: true } },
          giftcards: { select: { amount: true, status: true, reportedAmount: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: ORDER_BOOK_LIMIT,
      }),
      prisma.order.count({
        where: { createdAt: { gte: todayStart }, status: { not: 'CANCELLED' } },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { creditLimit: true },
      }),
      prisma.order.findMany({
        where: { userId, status: { in: ['PENDING', 'AWAITING_PAYMENT'] } },
        select: {
          total: true,
          buyRate: true,
          giftcards: {
            select: { amount: true, status: true, reportedAmount: true },
          },
        },
      }),
      prisma.order.findMany({
        where: { userId, status: 'COMPLETED' },
        select: {
          id: true,
          total: true,
          adjustedTotal: true,
          giftcards: { select: { amount: true, status: true, reportedAmount: true } },
        },
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
      (sum, order) => sum + Number(computeFaceValueTotal(order.giftcards)),
      0,
    );

    // Compute total saved: effective face value - paid across all completed orders.
    // Face value is status-aware (computeFaceValueTotal): cards with issues
    // (INVALID/ALREADY_USED/DEACTIVATED/WRONG_AMOUNT) are already discounted from
    // adjustedTotal — counting their nominal amount would count refunds as savings.
    let totalSaved = 0;
    for (const order of completedOrders) {
      const faceValue = Number(computeFaceValueTotal(order.giftcards));
      const paid = Number(order.adjustedTotal ?? order.total);
      totalSaved += Math.max(faceValue - paid, 0);
    }

    // Month spend
    const monthSpend = monthOrders.reduce((sum, o) => sum + Number(o.adjustedTotal ?? o.total), 0);

    const creditLimit = user?.creditLimit ? Number(user.creditLimit) : 0;

    const unpaidFaceValue = unpaidOrders.reduce(
      (sum, order) => sum + Number(computeFaceValueTotal(order.giftcards)),
      0,
    );
    const unpaidUsdt = unpaidOrders.reduce(
      (sum, order) => sum + Number(computeFaceValueTotal(order.giftcards).mul(order.buyRate)),
      0,
    );

    return {
      availableCards: available._count,
      availableAmount: available._sum.amount?.toNumber() ?? 0,
      orderBook: {
        totalOrdersToday: todayOrderCount,
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
        unpaidFaceValue,
        unpaidUsdt,
        availableCredit: creditLimit - unpaidFaceValue,
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
