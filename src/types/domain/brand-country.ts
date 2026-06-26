// ─────────────────────────────────────────────────────────────────────────────
// Brand-Country — Catalog types + shared Zod sub-schemas
// Brand and Country entities with their relationship.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

// ── Brand ─────────────────────────────────────────────────────────────────────

export interface Brand {
  id: string;
  slug: string;
  name: string;
  icon: string;
  image: string | null;
}

export const brandSchema = z.object({
  name: z.string(),
  icon: z.string(),
  image: z.string().nullable(),
});

// ── Country ───────────────────────────────────────────────────────────────────

export interface Country {
  id: string;
  name: string;
  code: string;
  currency: string | null;
}

export const countrySchema = z.object({
  name: z.string(),
  code: z.string(),
  currency: z.string().nullable(),
});

// ── BrandCountry ──────────────────────────────────────────────────────────────

export interface BrandCountry {
  id: string;
  brandId: string;
  countryId: string;
  brandName: string;
  brandSlug: string;
  brandIcon: string;
  brandImage: string | null;
  countryName: string;
  countryCode: string;
  countryCurrency: string;
  isActive: boolean;
  minAmount: number | null;
  maxAmount: number | null;
  stockCount: number;
  stockAmount: number;
}

// ── BrandCountry Summary (admin catalog views — without brand fields) ────────

export interface BrandCountrySummary {
  id: string;
  countryId: string;
  countryName: string;
  countryCode: string;
  minAmount: number | null;
  maxAmount: number | null;
  isActive: boolean;
}

// ── Brand with nested countries (admin catalog list) ─────────────────────────

export interface BrandWithCountries {
  id: string;
  name: string;
  slug: string;
  icon: string;
  image: string | null;
  isActive: boolean;
  countries: BrandCountrySummary[];
}
