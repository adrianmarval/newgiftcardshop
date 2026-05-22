'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const toggleBrandCountryActiveInputSchema = z.object({ brandId: z.string(), countryId: z.string(), isActive: z.boolean() });

export const toggleBrandCountryActive = adminActionClient
  .inputSchema(toggleBrandCountryActiveInputSchema)
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
