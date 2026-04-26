// ─────────────────────────────────────────────────────────────────────────────
// Catalog — BrandCountry entity
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

/**
 * Representa la relación entre un Brand y un Country con configuración de límites.
 *
 * Ejemplo:
 * ```json
 * {
 *   "brandId": "brand_amazon",
 *   "countryId": "country_us",
 *   "minAmount": 5,
 *   "maxAmount": 500
 * }
 * ```
 */
export const brandCountrySchema = z.object({
  brandId: z.string(),
  countryId: z.string(),
  brandName: z.string(),
  brandSlug: z.string(),
  brandIcon: z.string(),
  brandImage: z.string().nullable(),
  countryName: z.string(),
  countryCode: z.string(),
  isActive: z.boolean(),
  minAmount: z.number().nullable(),
  maxAmount: z.number().nullable(),
});

/** Tipo TypeScript para BrandCountry del catálogo. */
export type BrandCountry = z.infer<typeof brandCountrySchema>;

// ── Schemas de Acciones — BrandCountry ────────────────────────────────────────────

export const getBrandsByCountryInputSchema = z.object({
  countryId: z.string(),
});
export type GetBrandsByCountryInput = z.infer<typeof getBrandsByCountryInputSchema>;

export const getBrandsByCountryOutputSchema = z.union([
  z.object({ success: z.literal(true), brandCountries: z.array(brandCountrySchema) }),
  z.object({ error: z.string() }),
]);

export const getBrandCountryByIdInputSchema = z.object({
  brandId: z.string(),
  countryId: z.string(),
});
export type GetBrandCountryByIdInput = z.infer<typeof getBrandCountryByIdInputSchema>;

export const getBrandCountryByIdOutputSchema = z.union([
  z.object({ success: z.literal(true), brandCountry: brandCountrySchema.nullable() }),
  z.object({ error: z.string() }),
]);

export const getActiveBrandCountriesOutputSchema = z.object({
  success: z.literal(true),
  brandCountries: z.array(brandCountrySchema),
});
