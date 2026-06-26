'use server';

import prisma from '@/lib/prisma';
import { ActionError, adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';
import { AVAILABLE_GIFTCARD_WHERE } from '@/lib/constants';

const removeCountryFromBrandInputSchema = z.object({ brandId: z.string(), countryId: z.string() });
const removeCountryFromBrandOutputSchema = z.object({ success: z.literal(true) });

export const removeCountryFromBrand = adminActionClient.inputSchema(removeCountryFromBrandInputSchema).outputSchema(removeCountryFromBrandOutputSchema).action(async ({ parsedInput }) => {
  const { brandId, countryId } = parsedInput;

  // Check if there are active giftcards for this combination
  const brandCountry = await prisma.brandCountry.findUnique({
    where: {
      brandId_countryId: { brandId, countryId },
    },
    include: {
      giftcards: { where: AVAILABLE_GIFTCARD_WHERE },
    },
  });

  if (brandCountry && brandCountry.giftcards.length > 0) {
    throw new ActionError('Cannot remove country with active giftcards');
  }

  await prisma.brandCountry.delete({
    where: {
      brandId_countryId: { brandId, countryId },
    },
  });

  return { success: true as const };
});
