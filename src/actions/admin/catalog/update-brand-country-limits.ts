'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const updateBrandCountryLimitsInputSchema = z.object({
  brandId: z.string(),
  countryId: z.string(),
  minAmount: z.number().nullable().optional(),
  maxAmount: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
});
const updateBrandCountryLimitsOutputSchema = z.object({ success: z.literal(true) });

export const updateBrandCountryLimits = adminActionClient
  .inputSchema(updateBrandCountryLimitsInputSchema)
  .outputSchema(updateBrandCountryLimitsOutputSchema)
  .action(async ({ parsedInput }) => {
    const { brandId, countryId, minAmount, maxAmount, isActive } = parsedInput;

    await prisma.brandCountry.update({
      where: {
        brandId_countryId: { brandId, countryId },
      },
      data: {
        ...(minAmount !== undefined && { minAmount: minAmount }),
        ...(maxAmount !== undefined && { maxAmount: maxAmount }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return { success: true as const };
  });
