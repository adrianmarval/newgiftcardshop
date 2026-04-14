// ─────────────────────────────────────────────────────────────────────────────
// Sell Component Props — Moved from @/types barrel
// ─────────────────────────────────────────────────────────────────────────────

import type { SellerBatch, Brand, Country } from '@/types';

/**
 * Props for the SellerCardsView component.
 * Displays a list of seller batches with filtering and expansion.
 */
export interface SellerCardsViewProps {
  batches: SellerBatch[];
}

/**
 * Props for the SellBatchManager component.
 * Manages the multi-step sell flow wizard.
 */
export interface SellBatchManagerProps {
  brands: Brand[];
  countries: Country[];
  sellRate: number;
}

/**
 * Props for the BrandStep component.
 * Allows seller to select brand and country for their batch.
 */
export interface BrandStepProps {
  brands: Brand[];
  countries: Country[];
}

/**
 * Props for the ReviewStep component.
 * Final review before publishing a batch.
 */
export interface ReviewStepProps {
  onPublish: () => void;
  isPublishing?: boolean;
  brandName: string;
  countryName: string;
  sellRate: number;
}

/**
 * Props for the BulkPasteDialog component.
 * Allows bulk import of gift card codes.
 */
export interface BulkPasteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (cards: import('@/types').ParsedGiftcard[]) => void;
}
