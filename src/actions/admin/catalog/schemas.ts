// ─────────────────────────────────────────────────────────────────────────────
// Admin / Catalog — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

/** Brand output shape — used by create + update + list brand actions. */
export const brandOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  icon: z.string(),
  image: z.string().nullable(),
  isActive: z.boolean(),
});

export const createBrandInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  slug: z.string().trim().min(1, 'Slug is required'),
  icon: z.string().default('📦'),
  image: z.string().nullable().optional(),
});

export const createBrandOutputSchema = z.object({
  success: z.literal(true),
  brand: brandOutputSchema,
});

export const updateBrandInputSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, 'Name is required'),
  slug: z.string().trim().min(1, 'Slug is required'),
  icon: z.string().default('📦'),
  image: z.string().nullable().optional(),
});

export const updateBrandOutputSchema = z.object({
  success: z.literal(true),
  brand: brandOutputSchema,
});

export const deleteBrandInputSchema = z.object({ id: z.string() });
export const deleteBrandOutputSchema = z.object({ success: z.literal(true) });

export const listBrandsOutputSchema = z.object({
  success: z.literal(true),
  brands: z
    .object({
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
          claimCodePattern: z.string().nullable(),
          stockDigestIntervalMinutes: z.number().nullable(),
        }),
      ),
    })
    .array(),
});

export const listCountriesOutputSchema = z.object({
  success: z.literal(true),
  countries: z
    .object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
      currency: z.string().nullable(),
    })
    .array(),
});

export const addCountryInputSchema = z.object({
  brandId: z.string(),
  countryId: z.string(),
  minAmount: z.number().nullable().optional(),
  maxAmount: z.number().nullable().optional(),
  isActive: z.boolean().default(true),
  claimCodePattern: z.string().nullable().optional(),
});

export const addCountryToBrandOutputSchema = z.object({ success: z.literal(true) });

export const removeCountryFromBrandInputSchema = z.object({
  brandId: z.string(),
  countryId: z.string(),
});

export const removeCountryFromBrandOutputSchema = z.object({ success: z.literal(true) });

export const toggleBrandActiveInputSchema = z.object({ id: z.string(), isActive: z.boolean() });
export const toggleBrandActiveOutputSchema = z.object({ success: z.literal(true) });

export const toggleBrandCountryActiveInputSchema = z.object({
  brandId: z.string(),
  countryId: z.string(),
  isActive: z.boolean(),
});

export const toggleBrandCountryActiveOutputSchema = z.object({ success: z.literal(true) });

export const updateBrandCountryLimitsInputSchema = z.object({
  brandId: z.string(),
  countryId: z.string(),
  minAmount: z.number().nullable().optional(),
  maxAmount: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
  claimCodePattern: z.string().nullable().optional(),
  stockDigestIntervalMinutes: z.number().int().min(5).max(1440).nullable().optional(),
});

export const updateBrandCountryLimitsOutputSchema = z.object({ success: z.literal(true) });