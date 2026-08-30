'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import {
  updateBrandCountryLimitsInputSchema,
  updateBrandCountryLimitsOutputSchema,
} from './schemas';

export const updateBrandCountryLimits = adminActionClient
  .inputSchema(updateBrandCountryLimitsInputSchema)
  .outputSchema(updateBrandCountryLimitsOutputSchema)
  .action(async ({ parsedInput }) => {
    const { brandId, countryId, minAmount, maxAmount, isActive, claimCodePattern, stockDigestIntervalMinutes, stockReminderIntervalMinutes } = parsedInput;

    await prisma.brandCountry.update({
      where: {
        brandId_countryId: { brandId, countryId },
      },
      data: {
        ...(minAmount !== undefined && { minAmount }),
        ...(maxAmount !== undefined && { maxAmount }),
        ...(isActive !== undefined && { isActive }),
        ...(claimCodePattern !== undefined && { claimCodePattern: claimCodePattern || null }),
        ...(stockDigestIntervalMinutes !== undefined && { stockDigestIntervalMinutes }),
        ...(stockReminderIntervalMinutes !== undefined && { stockReminderIntervalMinutes }),
      },
    });

    return { success: true as const };
  });