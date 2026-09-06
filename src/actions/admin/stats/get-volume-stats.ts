'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import { getVolumeStats as getVolumeStatsService } from '@/lib/services/stats';
import { getVolumeStatsInputSchema, getVolumeStatsOutputSchema } from './schemas';

export const getVolumeStats = adminActionClient
  .inputSchema(getVolumeStatsInputSchema)
  .outputSchema(getVolumeStatsOutputSchema)
  .action(async ({ parsedInput }) => {
    try {
      return await getVolumeStatsService(parsedInput.brandCountryId ?? null);
    } catch (error) {
      console.error('[getVolumeStats]', error);
      throw new ActionError('Error al obtener las estadísticas de volumen.');
    }
  });
