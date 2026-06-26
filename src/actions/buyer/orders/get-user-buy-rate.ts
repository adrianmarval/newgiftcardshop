'use server';

import { z } from 'zod';
import { buyerActionClient, ActionError } from '@/lib/safe-action';
import { getUserRates } from '@/lib/services/pricing';

const getUserBuyRateInputSchema = z.object({
  brandCountryId: z.string().optional(),
  brandId: z.string().optional(),
  countryId: z.string().optional(),
});

const getUserBuyRateOutputSchema = z.object({
  success: z.literal(true),
  rate: z.number(),
});

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
