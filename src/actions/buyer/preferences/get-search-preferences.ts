'use server';

import { buyerActionClient, ActionError } from '@/lib/safe-action';
import { getSearchPreferences } from '@/lib/services/user/search-preferences';
import { getSearchPreferencesOutputSchema } from './schemas';

export const getUserSearchPreferences = buyerActionClient
  .outputSchema(getSearchPreferencesOutputSchema)
  .action(async ({ ctx }) => {
    try {
      const prefs = await getSearchPreferences(ctx.auth.user.id);
      return { success: true as const, ...prefs };
    } catch (error) {
      console.error('[getUserSearchPreferences]', error);
      throw new ActionError('Error al obtener las preferencias de búsqueda.');
    }
  });
