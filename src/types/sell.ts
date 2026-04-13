// ─────────────────────────────────────────────────────────────────────────────
// Component Props Types — React component prop interfaces for the sell flow
// Import from "@/types" to access these.
//
// Example:
//   import type { SellerCardsViewProps } from "@/types";
// ─────────────────────────────────────────────────────────────────────────────

import type { SellerBatch, Brand, Country, ParsedGiftCard } from "./domain";

// ── SellerCardsView ───────────────────────────────────────────────────────────

export interface SellerCardsViewProps {
  batches: SellerBatch[];
}

// ── SellBatchManager ──────────────────────────────────────────────────────────

export interface SellBatchManagerProps {
  brands: Brand[];
  countries: Country[];
  sellRate: number;
}

// ── BrandStep ─────────────────────────────────────────────────────────────────

export interface BrandStepProps {
  brands: Brand[];
  countries: Country[];
}

// ── ReviewStep ────────────────────────────────────────────────────────────────

export interface ReviewStepProps {
  onPublish: () => void;
  isPublishing?: boolean;
  brandName: string;
  countryName: string;
  sellRate: number;
}

// ── BulkPasteDialog ───────────────────────────────────────────────────────────

export interface BulkPasteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (cards: ParsedGiftCard[]) => void;
}
