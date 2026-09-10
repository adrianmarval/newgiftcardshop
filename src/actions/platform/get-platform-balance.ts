'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import { getPlatformBalance as getPlatformBalanceFromSettings } from '@/lib/settings/settings.service';
import { getPlatformBalanceOutputSchema } from './schemas';

export const getPlatformBalance = adminActionClient
  .outputSchema(getPlatformBalanceOutputSchema)
  .action(async () => {
    try {
      return {
        success: true as const,
        balance: Number(await getPlatformBalanceFromSettings()),
      };
    } catch (error) {
      console.error('[getPlatformBalance]', error);
      throw new ActionError('Error al obtener el balance de la plataforma.');
    }
  });
