'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const removeCountryFromBrandInputSchema = z.object({ brandId: z.string(), countryId: z.string() });

export const removeCountryFromBrand = adminActionClient.inputSchema(removeCountryFromBrandInputSchema).action(async ({ parsedInput }) => {
  const { brandId, countryId } = parsedInput;

  // Check if there are active giftcards for this combination
  const brandCountry = await prisma.brandCountry.findUnique({
    where: {
      brandId_countryId: { brandId, countryId },
    },
    include: {
      giftcards: { where: { inStock: true, status: 'UNUSED' } },
    },
  });

  if (brandCountry && brandCountry.giftcards.length > 0) {
    throw new Error('Cannot remove country with active giftcards');
  }

  await prisma.brandCountry.delete({
    where: {
      brandId_countryId: { brandId, countryId },
    },
  });

  return { success: true as const };
});
