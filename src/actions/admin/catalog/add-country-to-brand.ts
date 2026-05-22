'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const addCountryInputSchema = z.object({
  brandId: z.string(),
  countryId: z.string(),
  minAmount: z.number().nullable().optional(),
  maxAmount: z.number().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const addCountryToBrand = adminActionClient
  .inputSchema(addCountryInputSchema)
  .action(async ({ parsedInput }) => {
    const { brandId, countryId, minAmount, maxAmount, isActive } = parsedInput;

    // Check if already exists
    const existing = await prisma.brandCountry.findUnique({
      where: {
        brandId_countryId: { brandId, countryId },
      },
    });

    if (existing) {
      throw new Error('Country already added to this brand');
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
