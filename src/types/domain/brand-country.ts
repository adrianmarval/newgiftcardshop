// ─────────────────────────────────────────────────────────────────────────────
// Brand-Country — Catalog types
// Brand and Country entities with their relationship.
// ─────────────────────────────────────────────────────────────────────────────

// ── Brand ─────────────────────────────────────────────────────────────────────

export interface Brand {
  id: string;
  slug: string;
  name: string;
  icon: string;
  image: string | null;
}

// ── Country ───────────────────────────────────────────────────────────────────

export interface Country {
  id: string;
  name: string;
  code: string;
  currency: string | null;
}

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
