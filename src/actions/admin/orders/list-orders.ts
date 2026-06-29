'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import { listOrdersService } from '@/lib/services/order/order-list.service';
import { listOrdersInputSchema, listOrdersOutputSchema } from './schemas';

export const listOrders = adminActionClient
  .inputSchema(listOrdersInputSchema)
  .outputSchema(listOrdersOutputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const result = await listOrdersService({
        scope: 'admin',
        buyerId: parsedInput.buyerId,
        status: parsedInput.status,
        dateFrom: parsedInput.dateFrom,
        dateTo: parsedInput.dateTo,
        search: parsedInput.search,
        page: parsedInput.page,
        limit: parsedInput.limit,
      });

      return {
        success: true as const,
        items: result.items as never,
        pagination: result.pagination,
      };
    } catch (error) {
      console.error('[listOrders]', error);
      throw new ActionError('Error al obtener las órdenes.');
    }
  });