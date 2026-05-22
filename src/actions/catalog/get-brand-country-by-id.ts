'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const brandCountrySchema = z.object({
  id: z.string(),
  brandId: z.string(),
  countryId: z.string(),
  brandName: z.string(),
  brandSlug: z.string(),
  brandIcon: z.string(),
  brandImage: z.string().nullable(),
  countryName: z.string(),
  countryCode: z.string(),
  countryCurrency: z.string().default('USD'),
  isActive: z.boolean(),
  minAmount: z.number().nullable(),
  maxAmount: z.number().nullable(),
});

const inputSchema = z.object({ brandId: z.string(), countryId: z.string() });
const outputSchema = z.union([
  z.object({ success: z.literal(true), brandCountry: brandCountrySchema.nullable() }),
  z.object({ error: z.string() }),
]);

export const getBrandCountryById = authActionClient
  .inputSchema(inputSchema)
  .outputSchema(outputSchema)
  .action(async ({ parsedInput }) => {
    const { brandId, countryId } = parsedInput;

    const brandCountry = await prisma.brandCountry.findUnique({
      where: { brandId_countryId: { brandId, countryId } },
      include: { brand: true, country: true },
    });

    if (!brandCountry) {
      return { success: true, brandCountry: null };
    }

    return {
      success: true,
      brandCountry: {
        id: brandCountry.id,
        brandId: brandCountry.brandId,
        countryId: brandCountry.countryId,
        brandName: brandCountry.brand.name,
        brandSlug: brandCountry.brand.slug,
        brandIcon: brandCountry.brand.icon,
        brandImage: brandCountry.brand.image,
        countryName: brandCountry.country.name,
        countryCode: brandCountry.country.code,
        countryCurrency: brandCountry.country.currency || 'USD',
        isActive: brandCountry.isActive,
        minAmount: brandCountry.minAmount ? Number(brandCountry.minAmount) : null,
        maxAmount: brandCountry.maxAmount ? Number(brandCountry.maxAmount) : null,
      },
    };
  });
