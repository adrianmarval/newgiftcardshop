'use server';

import { buyerActionClient, ActionError } from '@/lib/safe-action';
import { getLiveAvailability as getLiveAvailabilityService } from '@/lib/services/stats';
import { liveAvailabilityOutputSchema } from './schemas';

/**
 * Live availability per brand-country, scoped to the brands where the buyer
 * has an assigned rate. Per brand it returns BOTH the total in-stock numbers
 * and the ACCESSIBLE ones (escalationTier <= buyer buyRate — what they can
 * actually buy right now). Powers the live availability grid on the buyer
 * dashboard (re-rendered every 15s by AutoRefreshProvider).
 */
export const getLiveAvailability = buyerActionClient.outputSchema(liveAvailabilityOutputSchema).action(async ({ ctx }) => {
  try {
    return await getLiveAvailabilityService(ctx.auth.user.id);
  } catch (error) {
    console.error('[getLiveAvailability]', error);
    throw new ActionError('Error al obtener la disponibilidad.');
  }
});
