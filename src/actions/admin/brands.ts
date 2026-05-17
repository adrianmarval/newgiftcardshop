'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';

// ─── Output Schemas ──────────────────────────────────────────────────────────────────────

const brandWithCountriesSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  icon: z.string(),
  image: z.string().nullable(),
  isActive: z.boolean(),
  countries: z.array(
    z.object({
      id: z.string(),
      countryId: z.string(),
      countryName: z.string(),
      countryCode: z.string(),
      minAmount: z.number().nullable(),
      maxAmount: z.number().nullable(),
      isActive: z.boolean(),
      buyRate: z.number().nullable(),
      sellRate: z.number().nullable(),
    }),
  ),
});

const getBrandsOutputSchema = z.object({
  success: z.literal(true),
  brands: brandWithCountriesSchema.array(),
});

const countrySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
});

const brandResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  icon: z.string(),
  image: z.string().nullable(),
  isActive: z.boolean(),
});

const getCountriesOutputSchema = z.object({
  success: z.literal(true),
  countries: countrySchema.array(),
});

// ─── Input Schemas ─────────────────────────────────────────────────────────────────────

const createBrandInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  icon: z.string().default('📦'),
  image: z.string().nullable().optional(),
});

const updateBrandInputSchema = createBrandInputSchema.extend({ id: z.string() });

const addCountryInputSchema = z.object({
  brandId: z.string(),
  countryId: z.string(),
  minAmount: z.number().nullable().optional(),
  maxAmount: z.number().nullable().optional(),
  isActive: z.boolean().default(true),
});

const updateCountryLimitsInputSchema = z.object({
  brandId: z.string(),
  countryId: z.string(),
  minAmount: z.number().nullable().optional(),
  maxAmount: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
});

// ─── Actions ────────────────────────────────────────────────────────────────────────

export const getAllBrands = adminActionClient.outputSchema(getBrandsOutputSchema).action(async () => {
  const brands = await prisma.brand.findMany({
    orderBy: { name: 'asc' },
    include: {
      countries: {
        include: {
          country: true,
          rate: true,
        },
      },
    },
  });

  return {
    success: true as const,
    brands: brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      icon: brand.icon,
      image: brand.image,
      isActive: brand.isActive,
      countries: brand.countries.map((bc) => ({
        id: bc.id,
        countryId: bc.countryId,
        countryName: bc.country.name,
        countryCode: bc.country.code,
        minAmount: bc.minAmount ? Number(bc.minAmount) : null,
        maxAmount: bc.maxAmount ? Number(bc.maxAmount) : null,
        isActive: bc.isActive,
        buyRate: bc.rate ? Number(bc.rate.buyRate) : null,
        sellRate: bc.rate ? Number(bc.rate.sellRate) : null,
      })),
    })),
  };
});

export const getAllCountries = adminActionClient.outputSchema(getCountriesOutputSchema).action(async () => {
  const countries = await prisma.country.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  return {
    success: true as const,
    countries: countries.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
    })),
  };
});

export const createBrand = adminActionClient
  .inputSchema(createBrandInputSchema)
  .outputSchema(z.object({ success: z.literal(true), brand: brandResultSchema }))
  .action(async ({ parsedInput }) => {
    const brand = await prisma.brand.create({
      data: parsedInput,
    });

    return { success: true as const, brand };
  });

export const updateBrand = adminActionClient
  .inputSchema(updateBrandInputSchema)
  .outputSchema(z.object({ success: z.literal(true), brand: brandResultSchema }))
  .action(async ({ parsedInput }) => {
    const { id, ...data } = parsedInput;
    const brand = await prisma.brand.update({
      where: { id },
      data,
    });

    return { success: true as const, brand };
  });

export const deleteBrand = adminActionClient
  .inputSchema(z.object({ id: z.string() }))
  .outputSchema(z.object({ success: z.literal(true) }))
  .action(async ({ parsedInput }) => {
    const { id } = parsedInput;

    // Check if brand has giftcards
    const giftcardCount = await prisma.giftcard.count({
      where: { brandCountry: { brandId: id } },
    });

    if (giftcardCount > 0) {
      throw new Error('Cannot delete brand with existing giftcards');
    }

    // Delete brand countries first
    await prisma.brandCountry.deleteMany({ where: { brandId: id } });

    // Delete brand
    await prisma.brand.delete({ where: { id } });

    return { success: true as const };
  });

export const addCountryToBrand = adminActionClient
  .inputSchema(addCountryInputSchema)
  .outputSchema(z.object({ success: z.literal(true) }))
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

export const updateBrandCountryLimits = adminActionClient
  .inputSchema(
    z.object({
      brandId: z.string(),
      countryId: z.string(),
      minAmount: z.number().nullable().optional(),
      maxAmount: z.number().nullable().optional(),
      isActive: z.boolean().optional(),
    }),
  )
  .outputSchema(z.object({ success: z.literal(true) }))
  .action(async ({ parsedInput }) => {
    const { brandId, countryId, minAmount, maxAmount, isActive } = parsedInput;

    await prisma.brandCountry.update({
      where: {
        brandId_countryId: { brandId, countryId },
      },
      data: {
        ...(minAmount !== undefined && { minAmount: minAmount }),
        ...(maxAmount !== undefined && { maxAmount: maxAmount }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return { success: true as const };
  });

export const removeCountryFromBrand = adminActionClient
  .inputSchema(z.object({ brandId: z.string(), countryId: z.string() }))
  .outputSchema(z.object({ success: z.literal(true) }))
  .action(async ({ parsedInput }) => {
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

export const toggleBrandActive = adminActionClient
  .inputSchema(z.object({ id: z.string(), isActive: z.boolean() }))
  .outputSchema(z.object({ success: z.literal(true) }))
  .action(async ({ parsedInput }) => {
    const { id, isActive } = parsedInput;

    await prisma.brand.update({
      where: { id },
      data: { isActive },
    });

    return { success: true as const };
  });

export const toggleBrandCountryActive = adminActionClient
  .inputSchema(z.object({ brandId: z.string(), countryId: z.string(), isActive: z.boolean() }))
  .outputSchema(z.object({ success: z.literal(true) }))
  .action(async ({ parsedInput }) => {
    const { brandId, countryId, isActive } = parsedInput;

    await prisma.brandCountry.update({
      where: {
        brandId_countryId: { brandId, countryId },
      },
      data: { isActive },
    });

    return { success: true as const };
  });

export const updateBrandCountryRate = adminActionClient
  .inputSchema(
    z.object({
      brandCountryId: z.string(),
      buyRate: z.number().min(0).max(1),
      sellRate: z.number().min(0).max(1),
    }),
  )
  .outputSchema(z.object({ success: z.literal(true) }))
  .action(async ({ parsedInput }) => {
    const { brandCountryId, buyRate, sellRate } = parsedInput;

    await prisma.brandCountryRate.upsert({
      where: { brandCountryId },
      create: {
        brandCountryId,
        buyRate,
        sellRate,
      },
      update: {
        buyRate,
        sellRate,
      },
    });

    return { success: true as const };
  });
