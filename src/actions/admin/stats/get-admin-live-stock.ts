'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import { getAdminLiveStock as getAdminLiveStockService } from '@/lib/services/stats';
import { getAdminLiveStockOutputSchema } from './schemas';

/**
 * Stock en vivo global por brand-country (sin scoping por tasa — el admin ve
 * el total de plataforma). Primer paint del AdminLiveStockGrid; el refetch
 * client-side va por /api/query/admin-live-stock (QUERY_REGISTRY).
 */
export const getAdminLiveStock = adminActionClient.outputSchema(getAdminLiveStockOutputSchema).action(async () => {
  try {
    return await getAdminLiveStockService();
  } catch (error) {
    console.error('[getAdminLiveStock]', error);
    throw new ActionError('Error al obtener el stock en vivo.');
  }
});
