'use server';

import { buyerActionClient, ActionError } from '@/lib/safe-action';
import { listOrdersService } from '@/lib/services/order/order-list.service';
import { listOrdersInputSchema, listOrdersOutputSchema } from './schemas';

export const listOrders = buyerActionClient
  .inputSchema(listOrdersInputSchema)
  .outputSchema(listOrdersOutputSchema)
  .action(async ({ ctx, parsedInput }) => {
    try {
      const result = await listOrdersService({
        scope: 'buyer',
        userId: ctx.auth.user.id,
        status: parsedInput.status,
        search: parsedInput.search,
        page: parsedInput.page,
        limit: parsedInput.limit,
        sort: parsedInput.sort,
      });

      return {
        success: true as const,
        items: result.items as never,
        pagination: result.pagination,
      };
    } catch (error) {
      console.error('[listOrders]', error);
      throw new ActionError('Error al obtener las órdenes. Intenta de nuevo.');
    }
  });