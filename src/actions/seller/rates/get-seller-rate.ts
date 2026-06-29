'use server';

import { sellerActionClient } from '@/lib/safe-action';
import { getUserRates } from '@/lib/services/pricing';
import { getSellerRateInputSchema, getSellerRateOutputSchema } from './schemas';

export const getSellerRate = sellerActionClient
  .inputSchema(getSellerRateInputSchema)
  .outputSchema(getSellerRateOutputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { brandCountryId, brandId, countryId } = parsedInput;

    try {
      const rates = await getUserRates(ctx.auth.user.id, { brandCountryId, brandId, countryId });
      return {
        success: true as const,
        rate: Number(rates.sellRate),
      };
    } catch (error) {
      console.error(error);
      return {
        success: false as const,
        error: 'You do not have a rate assigned for this brand and country. Contact the administrator.',
      };
    }
  });