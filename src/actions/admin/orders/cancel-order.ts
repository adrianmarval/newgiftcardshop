'use server';

import prisma from '@/lib/prisma';
import { ActionError, adminActionClient } from '@/lib/safe-action';
import { canCancelOrder, cancelOrder as cancelOrderService } from '@/lib/services/order';
import { cancelOrderInputSchema, cancelOrderOutputSchema } from './schemas';

export const cancelOrder = adminActionClient
  .inputSchema(cancelOrderInputSchema)
  .outputSchema(cancelOrderOutputSchema)
  .useValidated(async ({ parsedInput: { orderId }, next }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { giftcards: true },
    });
    if (!order) throw new ActionError('Orden no encontrada en la base de datos');

    if (!canCancelOrder(order.giftcards)) {
      throw new ActionError('No se puede cancelar: la orden contiene tarjetas activas con valor. Espera a que se complete o contacta al soporte.');
    }

    return next({ ctx: { order } });
  })
  .action(async ({ ctx }) => {
    await cancelOrderService(ctx.order.id);
    return { success: true as const, message: '¡Orden cancelada con éxito!' };
  });