'use server';

import { Prisma } from '@/generated/prisma/client';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { findOrderForUser, confirmOrderUsage } from '@/lib/services/order';
import { confirmUsageInputSchema, confirmUsageOutputSchema } from './schemas';

export const confirmUsage = buyerActionClient
  .inputSchema(confirmUsageInputSchema)
  .outputSchema(confirmUsageOutputSchema)
  .useValidated(async ({ parsedInput: { orderId }, ctx, next }) => {
    const order = await findOrderForUser(orderId, ctx.auth.user.id);

    if (order.status !== 'PENDING') throw new ActionError('La orden no puede ser confirmada en su estado actual');

    return next({ ctx: { order } });
  })
  .action(async ({ ctx }) => {
    try {
      const { adjustedTotal } = await confirmOrderUsage(ctx.order.id, ctx.order.buyRate);
      return { success: true as const, adjustedTotal: adjustedTotal.toNumber() };
    } catch (err) {
      // Race cross-canal: la orden fue confirmada/cancelada desde otro canal
      // (bot u otra pestaña) entre el useValidated y este update guardado.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new ActionError('La orden ya fue procesada desde otra sesión');
      }
      throw err;
    }
  });