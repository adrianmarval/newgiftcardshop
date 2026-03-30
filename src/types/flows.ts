// ─────────────────────────────────────────────────────────────────────────────
// Flow Types — UI state types for the buy and sell flows
// These are consumed by Zustand stores (use-buy-flow, use-sell-flow) and the
// step components that participate in each multi-step wizard.
// ─────────────────────────────────────────────────────────────────────────────

// ── Buy Flow ──────────────────────────────────────────────────────────────────

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
export type BuyGiftcardStatus = "UNUSED" | "INVALID" | "ALREADY_USED" | "WRONG_AMOUNT" | "DEACTIVATED";

/**
 * Represents a single gift card item within the buy flow wizard.
 * The `status` field tracks the buyer's report after redemption.
 * When status is WRONG_AMOUNT, `reportedAmount` holds the corrected value.
 */
export interface BuyGiftcardItem {
  id: string;
  brand: string;
  amount: number;
  price: number;
  claimCode: string;
  pinCode?: string;
  status: BuyGiftcardStatus;
  /** Only present when status is "WRONG_AMOUNT". */
  reportedAmount?: number;
}

// ── Sell Flow ─────────────────────────────────────────────────────────────────

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
