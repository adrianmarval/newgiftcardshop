'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { deleteUserRatesInputSchema, deleteUserRatesOutputSchema } from './schemas';

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