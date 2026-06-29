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

export const getBrandsByCountryInputSchema = z.object({ countryId: z.string() });

export const getBrandsByCountryOutputSchema = z.union([
  z.object({ success: z.literal(true), brandCountries: z.array(brandCountryBaseSchema) }),
  z.object({ error: z.string() }),
]);

export const getActiveBrandCountriesOutputSchema = z.object({
  success: z.literal(true),
  brandCountries: z.array(brandCountryWithStockSchema),
});

export const getActiveCountriesOutputSchema = z.object({
  success: z.literal(true),
  countries: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
      currency: z.string().nullable(),
    }),
  ),
});

export const getActiveBrandsOutputSchema = z.object({
  success: z.literal(true),
  brands: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
      icon: z.string(),
      image: z.string().nullable(),
    }),
  ),
});