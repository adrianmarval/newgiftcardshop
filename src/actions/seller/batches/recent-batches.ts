'use server';

import { sellerActionClient, ActionError } from '@/lib/safe-action';
import { getRecentBatches } from '@/lib/services/stats';
import { recentBatchesOutputSchema } from './schemas';

export const recentBatches = sellerActionClient.outputSchema(recentBatchesOutputSchema).action(async ({ ctx }) => {
  try {
    return await getRecentBatches(ctx.auth.user.id);
  } catch (error) {
    console.error('[recentBatches]', error);
    throw new ActionError('Error al obtener los lotes recientes.');
  }
});
