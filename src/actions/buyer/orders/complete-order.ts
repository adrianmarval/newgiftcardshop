'use server';

import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { findOrderForUser, completeOrderPayment, OrderAlreadyProcessedError } from '@/lib/services/order';
import { logger } from '@/lib/logger';
import { completeOrderInputSchema, completeOrderOutputSchema } from './schemas';

export const completeOrder = buyerActionClient
  .inputSchema(completeOrderInputSchema)
  .outputSchema(completeOrderOutputSchema)
  .useValidated(async ({ parsedInput: { orderId }, ctx, next }) => {
    const order = await findOrderForUser(orderId, ctx.auth.user.id);

    if (order.status === 'COMPLETED') throw new ActionError('La orden ya ha sido completada');
    if (order.status !== 'AWAITING_PAYMENT') throw new ActionError('La orden debe ser confirmada antes de enviar el pago');

    return next({ ctx: { order } });
  })
  .action(async ({ parsedInput: { _transactionId }, ctx }) => {
    try {
      const result = await completeOrderPayment(ctx.order.id, _transactionId);

      logger.action('buy', 'complete-order', `Orden ${result.orderId} completada`, {
        userId: ctx.auth.user.id,
        metadata: { orderId: result.orderId, transactionId: _transactionId },
      });

      return { success: true as const, orderId: result.orderId, message: 'Orden completada con éxito' };
    } catch (err) {
      if (err instanceof OrderAlreadyProcessedError) {
        logger.warn('Orden ya procesada en complete-order', {
          userId: ctx.auth.user.id,
          metadata: { orderId: ctx.order.id },
        });
        throw new ActionError(err.message);
      }
      logger.error('Error al completar orden', {
        userId: ctx.auth.user.id,
        metadata: { orderId: ctx.order.id, transactionId: _transactionId },
        error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : 'Unknown' },
      });
      throw err;
    }
  });