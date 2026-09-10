// ─────────────────────────────────────────────────────────────────────────────
// Catalog — Server action schemas (public catalog queries)
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

/** Base brand-country shape — common to all brand-country responses. */
export const brandCountryBaseSchema = z.object({
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

/** Brand-country with current stock aggregates. */
export const brandCountryWithStockSchema = brandCountryBaseSchema.extend({
  stockCount: z.number(),
  stockAmount: z.number(),
});

export const getBrandByIdInputSchema = z.object({
  id: z.string(),
});

export const getBrandByIdOutputSchema = z.object({
  success: z.literal(true),
  brand: z
    .object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
      icon: z.string().nullable(),
      image: z.string().nullable(),
    })
    .nullable(),
});



export const getActiveBrandCountriesOutputSchema = z.object({
  success: z.literal(true),
  brandCountries: z.array(brandCountryWithStockSchema),
});

