'use server';

import { buyerActionClient } from '@/lib/safe-action';
import { getUserBuyRateOutputSchema } from '@/types/domain/order';
import { getUserRates } from '@/services/pricing.service';
import { z } from 'zod';

const getUserBuyRateInputSchema = z.object({
  brandCountryId: z.string().optional(),
  brandId: z.string().optional(),
  countryId: z.string().optional(),
});

export const getUserBuyRate = buyerActionClient
  .inputSchema(getUserBuyRateInputSchema)
  .outputSchema(getUserBuyRateOutputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { brandCountryId, brandId, countryId } = parsedInput;

    try {
      const rates = await getUserRates(ctx.auth.user.id, { brandCountryId, brandId, countryId });
      return {
        success: true as const,
        rate: Number(rates.buyRate),
      };
    } catch (error: any) {
      throw new Error(error.message || 'No se han configurado tarifas para esta marca y país.');
    }
  });
