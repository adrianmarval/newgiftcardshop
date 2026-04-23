// ─────────────────────────────────────────────────────────────────────────────
// Sell Component Props — Wizard and Dialog types only
// ─────────────────────────────────────────────────────────────────────────────

import type { Brand, Country } from '@/types/domain/catalog';
import type { ParsedGiftcard } from '@/types/domain/giftcard';

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
  /** The step number to go back to from review */
  backStep?: number;
}

/**
 * Props for the BulkPasteDialog component.
 * Allows bulk import of gift card codes.
 */
export interface BulkPasteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (cards: ParsedGiftcard[]) => void;
}
