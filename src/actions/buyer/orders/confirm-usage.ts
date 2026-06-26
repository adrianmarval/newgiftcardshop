'use server';

import { z } from 'zod';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { findOrderForUser, confirmOrderUsage } from '@/lib/services/order';

const confirmUsageInputSchema = z.object({ orderId: z.string() });

const confirmUsageOutputSchema = z.object({
  success: z.literal(true),
  adjustedTotal: z.number(),
});

export const confirmUsage = buyerActionClient
  .inputSchema(confirmUsageInputSchema)
  .outputSchema(confirmUsageOutputSchema)
  .useValidated(async ({ parsedInput: { orderId }, ctx, next }) => {
    const order = await findOrderForUser(orderId, ctx.auth.user.id);

    if (order.status !== 'PENDING') throw new ActionError('La orden no puede ser confirmada en su estado actual');

    return next({ ctx: { order } });
  })
  .action(async ({ ctx }) => {
    const { adjustedTotal } = await confirmOrderUsage(ctx.order.id, ctx.order.giftcards, ctx.order.buyRate);
    return { success: true as const, adjustedTotal: adjustedTotal.toNumber() };
  });
