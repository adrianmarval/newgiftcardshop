'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { confirmOrderUsageInputSchema, confirmOrderUsageOutputSchema } from '@/types/domain/order';

function computeEffectiveTotal(
  giftcards: { status: string; amount: Prisma.Decimal; reportedAmount: Prisma.Decimal | null }[],
  buyRate: Prisma.Decimal,
): number {
  const rawTotal = giftcards.reduce((sum, card) => {
    if (card.status === 'UNUSED') return sum.plus(card.amount);
    if (card.status === 'WRONG_AMOUNT') return sum.plus(card.reportedAmount ?? new Prisma.Decimal(0));
    return sum;
  }, new Prisma.Decimal(0));
  return rawTotal.mul(buyRate).toNumber();
}

export const confirmOrderUsage = buyerActionClient
  .inputSchema(confirmOrderUsageInputSchema)
  .outputSchema(confirmOrderUsageOutputSchema)
  .useValidated(async ({ parsedInput: { orderId }, ctx, next }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { giftcards: true },
    });

    if (!order) throw new ActionError('Orden no encontrada');
    if (order.userId !== ctx.auth.user.id) throw new ActionError('No autorizado');
    if (order.status !== 'PENDING') throw new ActionError('La orden no puede ser confirmada en su estado actual');
    return next({ ctx: { order } });
  })
  .action(async ({ parsedInput: { orderId }, ctx }) => {
    const order = ctx.order;
    const adjustedTotal = computeEffectiveTotal(order.giftcards, order.buyRate);

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'AWAITING_PAYMENT',
        adjustedTotal: new Prisma.Decimal(adjustedTotal),
      },
    });

    return { success: true as const, adjustedTotal };
  });
