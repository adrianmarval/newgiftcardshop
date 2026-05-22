'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const updateUserRatesInputSchema = z.object({
  userId: z.string(),
  brandCountryId: z.string(),
  buyRate: z.number().min(0).max(1),
  sellRate: z.number().min(0).max(1),
});

const updateUserRatesOutputSchema = z.object({ success: z.literal(true) });

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
