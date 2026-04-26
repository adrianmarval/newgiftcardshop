// ─────────────────────────────────────────────────────────────────────────────
// Buy Component Props — Moved from @/types barrel
// ─────────────────────────────────────────────────────────────────────────────

import type { BrandCountry, BuyerOrder } from '@/types';

/**
 * Props for the SearchStep component.
 * Allows buyer to search for available gift cards.
 */
export interface SearchStepProps {
  brandCountries: BrandCountry[];
}

/**
 * Props for the BuyGiftcardManager component.
 * Manages the multi-step buy flow wizard.
 */
export interface BuyGiftcardManagerProps {
  brandCountries: BrandCountry[];
  /** When present, hydrates the store to resume this order. When absent, resets to step 1. */
  resumeOrder?: BuyerOrder | null;
}
