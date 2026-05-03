'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { confirmOrderUsageInputSchema, confirmOrderUsageOutputSchema } from '@/types/domain/order';

function computeEffectiveTotal(
  giftcards: { status: string; amount: Prisma.Decimal; reportedAmount: Prisma.Decimal | null }[],
  buyRate: Prisma.Decimal,
): Prisma.Decimal {
  const rawTotal = giftcards.reduce((sum, card) => {
    if (card.status === 'UNUSED') return sum.plus(card.amount);
    if (card.status === 'WRONG_AMOUNT') return sum.plus(card.reportedAmount ?? new Prisma.Decimal(0));
    return sum;
  }, new Prisma.Decimal(0));
  return rawTotal.mul(buyRate);
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

    const orderUpdated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'AWAITING_PAYMENT',
          adjustedTotal,
        },
      });
      for (const card of order.giftcards) {
        if (card.status === 'UNUSED') {
          await tx.giftcard.update({
            where: { id: card.id },
            data: { status: 'USED', isConfirmed: true },
          });
        } else {
          await tx.giftcard.update({
            where: { id: card.id },
            data: { isConfirmed: true, status: card.status },
          });
        }
      }
      return updatedOrder;
    });

    if (!orderUpdated) {
      throw new ActionError('Error al actualizar la orden');
    }

    return { success: true as const, adjustedTotal: adjustedTotal.toNumber() };
  });
