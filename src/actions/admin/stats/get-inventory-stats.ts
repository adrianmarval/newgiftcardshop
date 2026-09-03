'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import { getInventoryStats as getInventoryStatsService } from '@/lib/services/stats';
import { getInventoryStatsOutputSchema } from './schemas';

export const getInventoryStats = adminActionClient.outputSchema(getInventoryStatsOutputSchema).action(async () => {
  try {
    return await getInventoryStatsService();
  } catch (error) {
    console.error('[getInventoryStats]', error);
    throw new ActionError('Error al obtener las estadísticas de inventario.');
  }
});
