'use server';

import { sellerActionClient, ActionError } from '@/lib/safe-action';
import { getSellerStats as getSellerStatsService } from '@/lib/services/stats';
import { sellerStatsOutputSchema } from './schemas';

export const getSellerStats = sellerActionClient.outputSchema(sellerStatsOutputSchema).action(async ({ ctx }) => {
  try {
    return await getSellerStatsService(ctx.auth.user.id);
  } catch (error) {
    console.error('[getSellerStats]', error);
    throw new ActionError('Error al obtener las estadísticas.');
  }
});
