// ─────────────────────────────────────────────────────────────────────────────
// Sell Component Props — Wizard and Dialog types only
// ─────────────────────────────────────────────────────────────────────────────

import type { BrandCountry } from '@/types/domain/catalog';
import type { ParsedGiftcard } from '@/types/domain/giftcard';

/**
 * Props for the SellBatchManager component.
 * Manages the multi-step sell flow wizard.
 */
export interface SellBatchManagerProps {
  brandCountries: BrandCountry[];
  sellRate?: number;
}

/**
 * Props for the BrandStep component.
 * Allows seller to select brand-country combination for their batch.
 */
export interface BrandStepProps {
  brandCountries: BrandCountry[];
}

/**
 * Props for the ReviewStep component.
 * Final review before publishing a batch.
 */
export interface ReviewStepProps {
  onPublish: () => void;
  isPublishing?: boolean;
  brandCountry: BrandCountry;
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
