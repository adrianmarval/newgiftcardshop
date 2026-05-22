'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const deleteUserRatesInputSchema = z.object({
  userId: z.string(),
  brandCountryId: z.string(),
});

const deleteUserRatesOutputSchema = z.object({ success: z.literal(true) });

export const deleteUserRates = adminActionClient
  .inputSchema(deleteUserRatesInputSchema)
  .outputSchema(deleteUserRatesOutputSchema)
  .action(async ({ parsedInput }) => {
    const { userId, brandCountryId } = parsedInput;

    await prisma.userBrandCountryRate.delete({
      where: {
        userId_brandCountryId: {
          userId,
          brandCountryId,
        },
      },
    });

    return { success: true as const };
  });
