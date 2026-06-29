'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { getBrandsByCountryInputSchema, getBrandsByCountryOutputSchema } from './schemas';

export const getBrandsByCountry = authActionClient
  .inputSchema(getBrandsByCountryInputSchema)
  .outputSchema(getBrandsByCountryOutputSchema)
  .action(async ({ parsedInput }) => {
    const { countryId } = parsedInput;

    const brandCountries = await prisma.brandCountry.findMany({
      where: { countryId },
      include: { brand: true, country: true },
      orderBy: { brand: { name: 'asc' } },
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
      })),
    };
  });