'use server';

import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { getOrderCardsForBuyer, OrderCardsError } from '@/lib/services/order/order-cards';
import { getOrderCardsInputSchema, getOrderCardsOutputSchema } from './schemas';

export const getOrderCards = buyerActionClient
  .inputSchema(getOrderCardsInputSchema)
  .outputSchema(getOrderCardsOutputSchema)
  .action(async ({ parsedInput: { orderId }, ctx }) => {
    try {
      const result = await getOrderCardsForBuyer(orderId, ctx.auth.user.id);
      return { success: true as const, ...result };
    } catch (error) {
      if (error instanceof OrderCardsError) throw new ActionError(error.message);
      throw error;
    }
  });
