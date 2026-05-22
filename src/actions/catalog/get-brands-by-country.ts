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

const inputSchema = z.object({ countryId: z.string() });
const outputSchema = z.union([
  z.object({ success: z.literal(true), brandCountries: z.array(brandCountrySchema) }),
  z.object({ error: z.string() }),
]);

export const getBrandsByCountry = authActionClient
  .inputSchema(inputSchema)
  .outputSchema(outputSchema)
  .action(async ({ parsedInput }) => {
    const { countryId } = parsedInput;

    const brandCountries = await prisma.brandCountry.findMany({
      where: { countryId },
      include: { brand: true, country: true },
      orderBy: { brand: { name: 'asc' } },
    });

    return {
      success: true,
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
