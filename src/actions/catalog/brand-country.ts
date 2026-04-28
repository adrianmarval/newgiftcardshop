'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import {
  getBrandsByCountryInputSchema,
  getBrandsByCountryOutputSchema,
  getBrandCountryByIdInputSchema,
  getBrandCountryByIdOutputSchema,
  getActiveBrandCountriesOutputSchema,
} from '@/types/domain/catalog';

export const getBrandsByCountry = authActionClient
  .inputSchema(getBrandsByCountryInputSchema)
  .outputSchema(getBrandsByCountryOutputSchema)
  .action(async ({ parsedInput }) => {
    const { countryId } = parsedInput;

    const brandCountries = await prisma.brandCountry.findMany({
      where: {
        countryId,
      },
      include: {
        brand: true,
        country: true,
      },
      orderBy: {
        brand: {
          name: 'asc',
        },
      },
    });

    return {
      success: true,
      brandCountries: brandCountries.map((bc) => ({
        brandId: bc.brandId,
        countryId: bc.countryId,
        brandName: bc.brand.name,
        brandSlug: bc.brand.slug,
        brandIcon: bc.brand.icon,
        brandImage: bc.brand.image,
        countryName: bc.country.name,
        countryCode: bc.country.code,
        isActive: bc.isActive,
        minAmount: bc.minAmount ? Number(bc.minAmount) : null,
        maxAmount: bc.maxAmount ? Number(bc.maxAmount) : null,
      })),
    };
  });

export const getBrandCountryById = authActionClient
  .inputSchema(getBrandCountryByIdInputSchema)
  .outputSchema(getBrandCountryByIdOutputSchema)
  .action(async ({ parsedInput }) => {
    const { brandId, countryId } = parsedInput;

    const brandCountry = await prisma.brandCountry.findUnique({
      where: {
        brandId_countryId: {
          brandId,
          countryId,
        },
      },
      include: {
        brand: true,
        country: true,
      },
    });

    if (!brandCountry) {
      return {
        success: true,
        brandCountry: null,
      };
    }

    return {
      success: true,
      brandCountry: {
        brandId: brandCountry.brandId,
        countryId: brandCountry.countryId,
        brandName: brandCountry.brand.name,
        brandSlug: brandCountry.brand.slug,
        brandIcon: brandCountry.brand.icon,
        brandImage: brandCountry.brand.image,
        countryName: brandCountry.country.name,
        countryCode: brandCountry.country.code,
        isActive: brandCountry.isActive,
        minAmount: brandCountry.minAmount ? Number(brandCountry.minAmount) : null,
        maxAmount: brandCountry.maxAmount ? Number(brandCountry.maxAmount) : null,
      },
    };
  });

export const getActiveBrandCountries = authActionClient.outputSchema(getActiveBrandCountriesOutputSchema).action(async () => {
  const brandCountries = await prisma.brandCountry.findMany({
    where: {},
    include: {
      brand: true,
      country: true,
    },
    orderBy: [
      {
        country: {
          name: 'asc',
        },
      },
      {
        brand: {
          name: 'asc',
        },
      },
    ],
  });

  return {
    success: true,
    brandCountries: brandCountries.map((bc) => ({
      brandId: bc.brandId,
      countryId: bc.countryId,
      brandName: bc.brand.name,
      brandSlug: bc.brand.slug,
      brandIcon: bc.brand.icon,
      brandImage: bc.brand.image,
      countryName: bc.country.name,
      countryCode: bc.country.code,
      isActive: bc.isActive,
      minAmount: bc.minAmount ? Number(bc.minAmount) : null,
      maxAmount: bc.maxAmount ? Number(bc.maxAmount) : null,
    })),
  };
});
