// ─────────────────────────────────────────────────────────────────────────────
// Catalog — Barrel export
// ─────────────────────────────────────────────────────────────────────────────

export { brandSchema } from './Brand';
export type { Brand } from './Brand';
export { getBrandByIdInputSchema, getActiveBrandsOutputSchema, getBrandByIdOutputSchema } from './Brand';
export type { GetBrandByIdInput } from './Brand';

export { countrySchema } from './Country';
export type { Country } from './Country';
export { getCountryByIdInputSchema, getActiveCountriesOutputSchema, getCountryByIdOutputSchema } from './Country';
export type { GetCountryByIdInput } from './Country';

export { brandCountrySchema } from './BrandCountry';
export type { BrandCountry } from './BrandCountry';
export {
  getBrandsByCountryInputSchema,
  getBrandsByCountryOutputSchema,
  getBrandCountryByIdInputSchema,
  getBrandCountryByIdOutputSchema,
  getActiveBrandCountriesOutputSchema,
} from './BrandCountry';
export type { GetBrandsByCountryInput, GetBrandCountryByIdInput } from './BrandCountry';
