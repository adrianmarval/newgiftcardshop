'use server';

import { buyerActionClient, ActionError } from '@/lib/safe-action';
import prisma from '@/lib/prisma';
import { getSearchPreferencesOutputSchema } from './schemas';

export const getUserSearchPreferences = buyerActionClient
  .outputSchema(getSearchPreferencesOutputSchema)
  .action(async ({ ctx }) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: ctx.auth.user.id },
        select: {
          minAmountPreference: true,
          maxAmountPreference: true,
          allowSearchPreferences: true,
          allowBuyRateAdjustment: true,
        },
      });

      if (!user) {
        return {
          success: true as const,
          minAmount: null,
          maxAmount: null,
          allowSearchPreferences: false,
          allowBuyRateAdjustment: false,
          buyRate: null,
        };
      }

      return {
        success: true as const,
        minAmount: user.minAmountPreference ? Number(user.minAmountPreference) : null,
        maxAmount: user.maxAmountPreference ? Number(user.maxAmountPreference) : null,
        allowSearchPreferences: user.allowSearchPreferences,
        allowBuyRateAdjustment: user.allowBuyRateAdjustment,
        buyRate: null,
      };
    } catch (error) {
      console.error('[getUserSearchPreferences]', error);
      throw new ActionError('Error al obtener las preferencias de búsqueda.');
    }
  });