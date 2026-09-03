'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import { getProfitStats as getProfitStatsService } from '@/lib/services/stats';
import { getProfitStatsOutputSchema } from './schemas';

export const getProfitStats = adminActionClient.outputSchema(getProfitStatsOutputSchema).action(async () => {
  try {
    return await getProfitStatsService();
  } catch (error) {
    console.error('[getProfitStats]', error);
    throw new ActionError('Error al obtener las estadísticas de ganancias.');
  }
});
