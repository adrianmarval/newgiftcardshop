'use server';

import { buyerActionClient, ActionError } from '@/lib/safe-action';
import { getUserRates } from '@/lib/services/pricing';
import { getUserBuyRateInputSchema, getUserBuyRateOutputSchema } from './schemas';

export const getUserBuyRate = buyerActionClient
  .inputSchema(getUserBuyRateInputSchema)
  .outputSchema(getUserBuyRateOutputSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const { brandCountryId, brandId, countryId } = parsedInput;
      const rates = await getUserRates(ctx.auth.user.id, { brandCountryId, brandId, countryId });
      return {
        success: true as const,
        rate: Number(rates.buyRate),
      };
    } catch (error) {
      console.error('[getUserBuyRate]', error);
      throw new ActionError('Error al obtener la tasa de compra.');
    }
  });