'use server';

import { sellerActionClient } from '@/lib/safe-action';
import { getSellerRateOutputSchema } from '@/types/domain/seller';
import { getUserRates } from '@/services/pricing.service';
import { z } from 'zod';

const getSellerRateInputSchema = z.object({
  brandCountryId: z.string().optional(),
  brandId: z.string().optional(),
  countryId: z.string().optional(),
});

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
    } catch (error: any) {
      return {
        success: false as const,
        error: error.message || 'No se han configurado tarifas para esta marca y país.',
      };
    }
  });
