'use server';

import { z } from 'zod';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { findOrderForUser, canCancelOrder, cancelOrder as cancelOrderService } from '@/lib/services/order';

const cancelOrderInputSchema = z.object({ orderId: z.string() });

const cancelOrderOutputSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

export const cancelOrder = buyerActionClient
  .inputSchema(cancelOrderInputSchema)
  .outputSchema(cancelOrderOutputSchema)
  .useValidated(async ({ parsedInput: { orderId }, ctx, next }) => {
    const order = await findOrderForUser(orderId, ctx.auth.user.id);

    if (order.status !== 'PENDING') throw new ActionError('Solo se pueden cancelar órdenes pendientes');
    if (!canCancelOrder(order.giftcards)) {
      throw new ActionError('No se puede cancelar: la orden contiene tarjetas activas con valor.');
    }

    return next({ ctx: { order } });
  })
  .action(async ({ ctx }) => {
    await cancelOrderService(ctx.order.id);
    return { success: true as const, message: '¡Orden cancelada con éxito!' };
  });
