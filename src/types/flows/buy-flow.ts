// ─────────────────────────────────────────────────────────────────────────────
// Flow Types — Buy flow state types
// These are consumed by Zustand stores (use-buy-flow) and the
// step components that participate in the buy multi-step wizard.
// ─────────────────────────────────────────────────────────────────────────────

import type { GiftcardStatus } from '@/types/giftcard/giftcard';

// ── Buy Flow item types ────────────────────────────────────────────────────────

/**
 * Buyer-facing giftcard status — excludes 'USED' since buyers never receive
 * an already-used card.
 */
export type BuyFlowGiftcardStatus = Exclude<GiftcardStatus, 'USED'>;

/**
 * Represents a single gift card item within the buy flow wizard.
 * The `status` field tracks the buyer's report after redemption.
 * When status is WRONG_AMOUNT, `reportedAmount` holds the corrected value.
 */
export interface BuyFlowGiftcard {
  id: string;
  brand: string;
  amount: number;
  /** Only populated after the order is created and codes are revealed (step 3). */
  claimCode?: string;
  pinCode?: string;
  status: BuyFlowGiftcardStatus;
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
  foundGiftcards: BuyFlowGiftcard[];
  orderId: string | null;
  /** Set after confirmOrderUsage succeeds — the server-calculated adjusted total. */
  adjustedTotal: number | null;

  // Actions
  setStep: (step: number) => void;
  setSelectedBrand: (brand: string) => void;
  setSelectedCountry: (country: string) => void;
  setTargetAmount: (amount: string) => void;
  setFoundGiftcards: (cards: BuyFlowGiftcard[]) => void;
  setOrderId: (id: string | null) => void;
  setAdjustedTotal: (total: number | null) => void;

  removeGiftcard: (id: string) => void;
  reportIssue: (id: string, status: BuyFlowGiftcardStatus, correctedAmount?: number) => void;
  resetForm: () => void;
}
