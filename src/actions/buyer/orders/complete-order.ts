'use server';

import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { findOrderForUser, completeOrderPayment, OrderAlreadyProcessedError } from '@/lib/services/order';

const completeOrderInputSchema = z.object({
  orderId: z.string().min(1),
  _transactionId: z.string().trim().min(1, 'Transaction ID is required'),
});

const completeOrderOutputSchema = z.object({
  success: z.literal(true),
  orderId: z.string(),
  message: z.string(),
});

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
      return { success: true as const, orderId: result.orderId, message: 'Orden completada con éxito' };
    } catch (err) {
      if (err instanceof OrderAlreadyProcessedError) {
        throw new ActionError(err.message);
      }
      throw err;
    }
  });
