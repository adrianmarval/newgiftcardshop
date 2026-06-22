'use server';

import { z } from 'zod';
import { sellerActionClient } from '@/lib/safe-action';
import { getUserRates } from '@/services/pricing.service';

const getSellerRateInputSchema = z.object({
  brandCountryId: z.string().optional(),
  brandId: z.string().optional(),
  countryId: z.string().optional(),
});

const getSellerRateOutputSchema = z.union([
  z.object({ success: z.literal(true), rate: z.number() }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

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
