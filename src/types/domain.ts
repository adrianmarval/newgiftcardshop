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
export type GiftcardStatus = "USED" | "UNUSED" | "ALREADY_USED" | "INVALID" | "DEACTIVATED" | "WRONG_AMOUNT";

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

// ── Gift Card Issues ──────────────────────────────────────────────────────────

/**
 * A buyer-reported issue on a gift card within an order.
 * Created via reportGiftcardIssue() and stored in GiftcardIssue.
 */
export interface GiftcardIssue {
  id: string;
  issueType: "INVALID" | "ALREADY_USED" | "DEACTIVATED" | "WRONG_AMOUNT";
  reportedAmount?: number | null;
  proofImageUrl?: string | null;
  giftcardId: string;
  orderId: string;
  reportedById: string;
  sellerId?: string | null;
  createdAt: string;
}

// ── Platform Settings ─────────────────────────────────────────────────────────

/** A key/value platform configuration entry managed by admins. */
export interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  description?: string | null;
}
