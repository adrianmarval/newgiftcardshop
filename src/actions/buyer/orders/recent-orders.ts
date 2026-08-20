'use server';

import prisma from '@/lib/prisma';
import { buyerActionClient, ActionError } from '@/lib/safe-action';
import { recentOrdersOutputSchema } from './schemas';

export const recentOrders = buyerActionClient.outputSchema(recentOrdersOutputSchema).action(async ({ ctx }) => {
  try {
    const userId = ctx.auth.user.id;

    const orders = await prisma.order.findMany({
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

    const orderIds = orders.map((o) => o.id);

    const aggregates = await prisma.giftcard.groupBy({
      by: ['orderId'],
      where: { orderId: { in: orderIds } },
      _sum: { amount: true },
      _count: { id: true },
    });

    const aggregateMap = new Map(aggregates.map((a) => [a.orderId, { faceValue: Number(a._sum.amount ?? 0), totalCards: a._count.id }]));

    return orders.map((order) => {
      const giftcards = order.giftcards.map((card) => ({
        id: card.id,
        amount: Number(card.amount),
        brand: {
          name: card.brandCountry.brand.name,
          icon: card.brandCountry.brand.icon,
          image: card.brandCountry.brand.image,
        },
      }));

      const agg = aggregateMap.get(order.id);
      const faceValueTotal = agg?.faceValue ?? 0;
      const cardsCount = agg?.totalCards ?? order._count.giftcards;
      const effectiveTotal = Number(order.adjustedTotal ?? order.total);

      return {
        id: order.id,
        status: order.status,
        total: Number(order.total),
        adjustedTotal: order.adjustedTotal ? Number(order.adjustedTotal) : null,
        createdAt: order.createdAt.toISOString(),
        cardsCount,
        faceValueTotal,
        effectiveTotal,
        giftcards,
      };
    });
  } catch (error) {
    console.error('[recentOrders]', error);
    throw new ActionError('Error al obtener las órdenes recientes.');
  }
});
