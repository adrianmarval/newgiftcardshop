// ─────────────────────────────────────────────────────────────────────────────
// Flow Types — Sell flow state types
// These are consumed by Zustand stores (use-sell-flow) and the
// step components that participate in the sell multi-step wizard.
// ─────────────────────────────────────────────────────────────────────────────

// ── Sell Flow item types ───────────────────────────────────────────────────────

/**
 * Represents a single gift card being entered by a seller in the sell flow
 * wizard. All fields are strings because they come directly from form inputs
 * before any parsing or validation.
 */
export interface GiftCardItem {
  id: string;
  amount: string;
  claimCode: string;
  pinCode?: string;
}

// ── Sell Flow State ───────────────────────────────────────────────────────────

/**
 * Zustand store shape for the sell flow wizard.
 */
export interface SellFlowState {
  step: number;
  selectedBrand: string;
  selectedCountry: string;
  giftcards: GiftCardItem[];

  // Actions
  setStep: (step: number) => void;
  setSelectedBrand: (brand: string) => void;
  setSelectedCountry: (country: string) => void;
  setGiftcards: (giftcards: GiftCardItem[]) => void;

  addGiftcard: () => void;
  removeGiftcard: (id: string) => void;
  updateGiftcard: (id: string, field: keyof GiftCardItem, value: string) => void;
  handleBulkImport: (cards: { amount: string; claimCode: string }[]) => void;
  resetForm: () => void;
}
