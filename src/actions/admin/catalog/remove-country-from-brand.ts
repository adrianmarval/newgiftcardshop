'use server';

import prisma from '@/lib/prisma';
import { ActionError, adminActionClient } from '@/lib/safe-action';
import { AVAILABLE_GIFTCARD_WHERE } from '@/lib/constants';
import {
  removeCountryFromBrandInputSchema,
  removeCountryFromBrandOutputSchema,
} from './schemas';

export const removeCountryFromBrand = adminActionClient
  .inputSchema(removeCountryFromBrandInputSchema)
  .outputSchema(removeCountryFromBrandOutputSchema)
  .action(async ({ parsedInput }) => {
    const { brandId, countryId } = parsedInput;

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