'use server';

import prisma from '@/lib/prisma';
import { ActionError, adminActionClient } from '@/lib/safe-action';
import { addCountryInputSchema, addCountryToBrandOutputSchema } from './schemas';

export const addCountryToBrand = adminActionClient
  .inputSchema(addCountryInputSchema)
  .outputSchema(addCountryToBrandOutputSchema)
  .action(async ({ parsedInput }) => {
    const { brandId, countryId, minAmount, maxAmount, isActive } = parsedInput;

    const existing = await prisma.brandCountry.findUnique({
      where: {
        brandId_countryId: { brandId, countryId },
      },
    });

    if (existing) {
      throw new ActionError('Country already added to this brand');
    }

    await prisma.brandCountry.create({
      data: {
        brandId,
        countryId,
        minAmount: minAmount ?? null,
        maxAmount: maxAmount ?? null,
        isActive,
      },
    });

    return { success: true as const };
  });