'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { AVAILABLE_GIFTCARD_WHERE } from '@/lib/constants';
import { getActiveBrandCountriesOutputSchema } from './schemas';

export const getActiveBrandCountries = authActionClient
  .outputSchema(getActiveBrandCountriesOutputSchema)
  .action(async () => {
    const brandCountries = await prisma.brandCountry.findMany({
      where: {},
      include: {
        brand: true,
        country: true,
        giftcards: {
          where: AVAILABLE_GIFTCARD_WHERE,
          select: { amount: true },
        },
      },
      orderBy: [{ country: { name: 'asc' } }, { brand: { name: 'asc' } }],
    });

    return {
      success: true as const,
      brandCountries: brandCountries.map((bc) => ({
        id: bc.id,
        brandId: bc.brandId,
        countryId: bc.countryId,
        brandName: bc.brand.name,
        brandSlug: bc.brand.slug,
        brandIcon: bc.brand.icon,
        brandImage: bc.brand.image,
        countryName: bc.country.name,
        countryCode: bc.country.code,
        countryCurrency: bc.country.currency || 'USD',
        isActive: bc.isActive,
        minAmount: bc.minAmount ? Number(bc.minAmount) : null,
        maxAmount: bc.maxAmount ? Number(bc.maxAmount) : null,
        stockCount: bc.giftcards.length,
        stockAmount: bc.giftcards.reduce((sum, gc) => sum + gc.amount.toNumber(), 0),
      })),
    };
  });