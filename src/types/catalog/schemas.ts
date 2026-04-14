// ─────────────────────────────────────────────────────────────────────────────
// Catalog Schemas — Input/Output Zod schemas for catalog actions (brands, countries)
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { brandSchema, countrySchema } from './brand';

// ── Brand Actions ──────────────────────────────────────────────────────────────

/** Input schema for getBrandById action */
export const getBrandByIdInputSchema = z.object({ id: z.string() });

export type GetBrandByIdInput = z.infer<typeof getBrandByIdInputSchema>;

/** Output schema for getActiveBrands action */
export const getActiveBrandsOutputSchema = z.object({
  success: z.literal(true),
  brands: z.array(brandSchema),
});

/** Output schema for getBrandById action */
export const getBrandByIdOutputSchema = z.union([
  z.object({ success: z.literal(true), brand: brandSchema.nullable() }),
  z.object({ error: z.string() }),
]);

// ── Country Actions ────────────────────────────────────────────────────────────

/** Input schema for getCountryById action */
export const getCountryByIdInputSchema = z.object({ id: z.string() });

export type GetCountryByIdInput = z.infer<typeof getCountryByIdInputSchema>;

/** Output schema for getActiveCountries action */
export const getActiveCountriesOutputSchema = z.object({
  success: z.literal(true),
  countries: z.array(countrySchema),
});

/** Output schema for getCountryById action */
export const getCountryByIdOutputSchema = z.union([
  z.object({ success: z.literal(true), country: countrySchema.nullable() }),
  z.object({ error: z.string() }),
]);
