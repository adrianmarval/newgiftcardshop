'use server';

import { buyerActionClient, ActionError } from '@/lib/safe-action';
import { getRecentOrders } from '@/lib/services/stats';
import { recentOrdersOutputSchema } from './schemas';

export const recentOrders = buyerActionClient.outputSchema(recentOrdersOutputSchema).action(async ({ ctx }) => {
  try {
    return await getRecentOrders(ctx.auth.user.id);
  } catch (error) {
    console.error('[recentOrders]', error);
    throw new ActionError('Error al obtener las órdenes recientes.');
  }
});
