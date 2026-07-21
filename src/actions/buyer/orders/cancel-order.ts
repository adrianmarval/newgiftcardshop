'use server';

import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { findOrderForUser, canCancelOrder, cancelOrder as cancelOrderService } from '@/lib/services/order';
import { cancelOrderInputSchema, cancelOrderOutputSchema } from './schemas';

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
    try {
      await cancelOrderService(ctx.order.id);
    } catch (err: any) {
      if (err?.code === 'P2025') throw new ActionError('La orden ya no está pendiente');
      throw err;
    }
    return { success: true as const, message: '¡Orden cancelada con éxito!' };
  });