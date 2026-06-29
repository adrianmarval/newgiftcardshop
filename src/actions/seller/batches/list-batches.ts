'use server';

import { sellerActionClient, ActionError } from '@/lib/safe-action';
import { listBatchesService } from '@/lib/services/giftcard';
import { listBatchesInputSchema, listBatchesOutputSchema } from './schemas';

export const listBatches = sellerActionClient
  .inputSchema(listBatchesInputSchema)
  .outputSchema(listBatchesOutputSchema)
  .action(async ({ ctx, parsedInput }) => {
    try {
      const result = await listBatchesService({
        scope: 'seller',
        userId: ctx.auth.user.id,
        status: parsedInput.status,
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