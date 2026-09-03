'use server';

import { buyerActionClient, ActionError } from '@/lib/safe-action';
import { getBuyerStats as getBuyerStatsService } from '@/lib/services/stats';
import { buyerStatsOutputSchema } from './schemas';

export const getBuyerStats = buyerActionClient.outputSchema(buyerStatsOutputSchema).action(async ({ ctx }) => {
  try {
    return await getBuyerStatsService(ctx.auth.user.id);
  } catch (error) {
    console.error('[getBuyerStats]', error);
    throw new ActionError('Error al obtener las estadísticas.');
  }
});
