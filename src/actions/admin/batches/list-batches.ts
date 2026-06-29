'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import { listBatchesService } from '@/lib/services/giftcard';
import { adminBatchListInputSchema, adminBatchListOutputSchema } from './schemas';

export const listBatches = adminActionClient
  .inputSchema(adminBatchListInputSchema)
  .outputSchema(adminBatchListOutputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const result = await listBatchesService({
        scope: 'admin',
        sellerId: parsedInput.sellerId,
        status: parsedInput.status,
        dateFrom: parsedInput.dateFrom,
        dateTo: parsedInput.dateTo,
        amountMin: parsedInput.amountMin,
        amountMax: parsedInput.amountMax,
        search: parsedInput.search,
        sort: parsedInput.sort,
        page: parsedInput.page,
        limit: parsedInput.limit,
      });

      return {
        success: true as const,
        items: result.items as never,
        pagination: result.pagination,
      };
    } catch (error) {
      console.error('[listBatches]', error);
      throw new ActionError('Error al obtener los lotes.');
    }
  });