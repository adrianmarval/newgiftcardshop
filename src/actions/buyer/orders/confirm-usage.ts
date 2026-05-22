'use server';

import prisma from '@/lib/prisma';
import { z } from 'zod';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { computeEffectiveTotalDecimal } from '@/lib/utils/action-helpers';

const confirmUsageInputSchema = z.object({ orderId: z.string() });

export const confirmUsage = buyerActionClient
  .inputSchema(confirmUsageInputSchema)
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
    const adjustedTotal = computeEffectiveTotalDecimal(order.giftcards, order.buyRate);

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
