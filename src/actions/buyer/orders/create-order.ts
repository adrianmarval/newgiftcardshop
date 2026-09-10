'use server';

import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { createOrderForBuyer, OrderCreationError } from '@/lib/services/order/order-creation';
import { createOrderInputSchema, createOrderOutputSchema } from './schemas';

export const createOrder = buyerActionClient
  .inputSchema(createOrderInputSchema)
  .outputSchema(createOrderOutputSchema)
  .action(async ({ parsedInput: { giftcardIds, idempotencyKey }, ctx }) => {
    try {
      const result = await createOrderForBuyer({
        userId: ctx.auth.user.id,
        giftcardIds,
        idempotencyKey,
        source: 'web',
      });
      return { success: true as const, orderId: result.orderId };
    } catch (error) {
      if (error instanceof OrderCreationError) {
        throw new ActionError(error.message);
      }
      throw error;
    }
  });
