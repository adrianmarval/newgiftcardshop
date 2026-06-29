'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import {
  toggleBrandCountryActiveInputSchema,
  toggleBrandCountryActiveOutputSchema,
} from './schemas';

export const toggleBrandCountryActive = adminActionClient
  .inputSchema(toggleBrandCountryActiveInputSchema)
  .outputSchema(toggleBrandCountryActiveOutputSchema)
  .action(async ({ parsedInput }) => {
    const { brandId, countryId, isActive } = parsedInput;

    await prisma.brandCountry.update({
      where: {
        brandId_countryId: { brandId, countryId },
      },
      data: { isActive },
    });

    return { success: true as const };
  });