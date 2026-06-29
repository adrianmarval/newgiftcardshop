'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { updateUserRatesInputSchema, updateUserRatesOutputSchema } from './schemas';

export const updateUserRates = adminActionClient
  .inputSchema(updateUserRatesInputSchema)
  .outputSchema(updateUserRatesOutputSchema)
  .action(async ({ parsedInput }) => {
    const { userId, brandCountryId, buyRate, sellRate } = parsedInput;

    await prisma.userBrandCountryRate.upsert({
      where: {
        userId_brandCountryId: {
          userId,
          brandCountryId,
        },
      },
      create: {
        userId,
        brandCountryId,
        buyRate,
        sellRate,
      },
      update: {
        buyRate,
        sellRate,
      },
    });

    return { success: true as const };
  });