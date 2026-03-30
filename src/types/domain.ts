// ─────────────────────────────────────────────────────────────────────────────
// Domain Types — Core business entities
// These types represent the serialised (client-safe) shape of domain objects
// returned from server actions. Decimal fields are numbers, Dates are ISO strings.
// ─────────────────────────────────────────────────────────────────────────────

// ── Brands ───────────────────────────────────────────────────────────────────

export interface Brand {
  id: string;
  slug: string;
  name: string;
  icon: string;
  image: string | null;
}

// ── Countries ────────────────────────────────────────────────────────────────

export interface Country {
  id: string;
  name: string;
  code: string;
  currency?: string | null;
}

// ── Gift Cards ───────────────────────────────────────────────────────────────

/** String-literal mirror of the Prisma GiftcardStatus enum — safe for client components. */
export type GiftcardStatus = "USED" | "UNUSED" | "ALREADY_USED" | "INVALID" | "DEACTIVATED";

/**
 * A gift card as returned from server actions that include brand/country
 * relations. The brand and country are lightweight sub-selections.
 */
export interface Giftcard {
  id: string;
  claimCode: string;
  pinCode: string | null;
  amount: number;
  price?: number;
  /** May contain any GiftcardStatus value or a raw string from older data. */
  status: GiftcardStatus | string;
  isConfirmed: boolean;
  /** Amount reported by the buyer when using/redeeming the card */
  reportedAmount?: number | null;
  orderId: string | null;
  batchId?: string | null;
  brand: Pick<Brand, "name" | "icon" | "image">;
  country: Pick<Country, "name" | "code"> | null;
}

// ── Order Dispute ──────────────────────────────────────────────────────────

/** String-literal mirror of the Prisma DisputeStatus enum */
export type DisputeStatus = "NONE" | "PENDING" | "ACCEPTED" | "REJECTED" | "RESOLVED";

/** String-literal mirror of the Prisma DisputeType enum */
export type DisputeType = "OVERPAID" | "UNDERPAID";

/**
 * Lightweight giftcard info for dispute context
 */
export interface DisputeGiftcard {
  id: string;
  amount: number;
  reportedAmount: number | null;
  brand: {
    name: string;
    icon: string;
  };
}

/**
 * User info for dispute context
 */
export interface DisputeUser {
  id: string;
  name: string;
  email: string;
}

/**
 * Full dispute data returned from server actions (for Buyer/Seller views)
 */
export interface Dispute {
  id: string;
  total: number;
  confirmedTotal: number | null;
  disputeStatus: DisputeStatus;
  disputeType: DisputeType | null;
  disputeReason: string | null;
  disputeDifference: number | null;
  disputeResolvedAt: string | Date | null;
  disputeNotes: string | null;
  giftcards: DisputeGiftcard[];
  user?: DisputeUser;
}

/**
 * Extended dispute details for Admin (includes order status)
 */
export interface DisputeDetails extends Dispute {
  status: string;
}

/**
 * Card discrepancy for preview
 */
export interface CardDiscrepancy {
  cardId: string;
  originalAmount: number;
  reportedAmount: number | null;
  hasDiscrepancy: boolean;
  difference: number;
}

/**
 * Represents an order with dispute data for amount discrepancies
 */
export interface OrderWithDispute {
  id: string;
  total: number;
  status: string;
  confirmedTotal?: number | null;
  disputeStatus: DisputeStatus;
  disputeType?: DisputeType | null;
  disputeReason?: string | null;
  disputeDifference?: number | null;
  disputeResolvedAt?: string | null;
  disputeNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Payments ─────────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  amount: number;
  balanceAfter?: number;
  status: string;
  transactionType?: string;
  createdAt: string;
  updatedAt?: string;
}

// ── Gift Card Batches ─────────────────────────────────────────────────────────

/**
 * A seller's gift-card batch as returned from getSellerBatches().
 * Named "Batch" in the UI layer to distinguish it from the Prisma
 * model "GiftcardBatch".
 */
export interface Batch {
  id: string;
  createdAt: string;
  updatedAt?: string;
  giftcards: Giftcard[];
  payments: Payment[];
}

// ── Bulk Import ───────────────────────────────────────────────────────────────

/** A single gift-card parsed from the bulk-paste dialog. */
export interface ParsedGiftCard {
  amount: string;
  claimCode: string;
}
