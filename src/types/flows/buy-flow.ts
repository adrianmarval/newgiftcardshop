// ─────────────────────────────────────────────────────────────────────────────
// Flow Types — Buy flow state types
// These are consumed by Zustand stores (use-buy-flow) and the
// step components that participate in the buy multi-step wizard.
// ─────────────────────────────────────────────────────────────────────────────

// ── Buy Flow item types ────────────────────────────────────────────────────────

/**
 * The redemption status a buyer can assign to a gift card during the
 * "Redeem & Verify" step of the buy flow.
 *
 * - UNUSED       → Card redeemed successfully at face value.
 * - WRONG_AMOUNT → Card redeemed but the actual balance differs from the listed amount.
 * - INVALID      → Code does not exist or is unreadable.
 * - ALREADY_USED → Code was already redeemed before the buyer received it.
 * - DEACTIVATED  → Card has been deactivated by the issuer.
 */
export type BuyGiftcardStatus = 'UNUSED' | 'INVALID' | 'ALREADY_USED' | 'WRONG_AMOUNT' | 'DEACTIVATED';

/**
 * Represents a single gift card item within the buy flow wizard.
 * The `status` field tracks the buyer's report after redemption.
 * When status is WRONG_AMOUNT, `reportedAmount` holds the corrected value.
 */
export interface BuyGiftcardItem {
  id: string;
  brand: string;
  amount: number;
  /** Only populated after the order is created and codes are revealed (step 3). */
  claimCode?: string;
  pinCode?: string;
  status: BuyGiftcardStatus;
  /** Only present when status is "WRONG_AMOUNT". */
  reportedAmount?: number;
  /** ownerId of the giftcard — used for issue tracking. */
  sellerId?: string;
}

// ── Buy Flow State ────────────────────────────────────────────────────────────

/**
 * Zustand store shape for the buy flow wizard.
 */
export interface BuyFlowState {
  step: number;
  selectedBrand: string;
  selectedCountry: string;
  targetAmount: string;
  foundGiftcards: BuyGiftcardItem[];
  orderId: string | null;
  /** Set after confirmOrderUsage succeeds — the server-calculated adjusted total. */
  adjustedTotal: number | null;

  // Actions
  setStep: (step: number) => void;
  setSelectedBrand: (brand: string) => void;
  setSelectedCountry: (country: string) => void;
  setTargetAmount: (amount: string) => void;
  setFoundGiftcards: (cards: BuyGiftcardItem[]) => void;
  setOrderId: (id: string | null) => void;
  setAdjustedTotal: (total: number | null) => void;

  removeGiftcard: (id: string) => void;
  reportIssue: (id: string, status: BuyGiftcardStatus, correctedAmount?: number) => void;
  resetForm: () => void;
}
