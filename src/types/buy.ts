// ─────────────────────────────────────────────────────────────────────────────
// Component Props Types — Buyer order components
// Import from "@/types" to access these.
// ─────────────────────────────────────────────────────────────────────────────

import type { Brand, Country, GiftcardStatus } from "./domain";

// ── Order Status ──────────────────────────────────────────────────────────────

export type OrderStatus = "PENDING" | "AWAITING_PAYMENT" | "COMPLETED" | "CANCELLED";

// ── Buyer Order Giftcard ──────────────────────────────────────────────────────

/**
 * A gift card within an order context, serialized for client components.
 * Includes brand info and buyer's reportedAmount.
 */
export interface BuyerOrderGiftcard {
  id: string;
  claimCode: string;
  pinCode: string | null;
  amount: number;
  status: GiftcardStatus | string;
  isConfirmed: boolean;
  reportedAmount: number | null;
  orderId: string | null;
  brand: Pick<Brand, "name" | "icon" | "image">;
  country: Pick<Country, "name" | "code"> | null;
}

// ── Buyer Order Payment ───────────────────────────────────────────────────────

export interface BuyerOrderPayment {
  id: string;
  amount: number;
  balanceAfter: number;
  status: string;
  transactionType: string;
  createdAt: string;
}

// ── Buyer Order ───────────────────────────────────────────────────────────────

/**
 * A buyer's order as returned from getBuyerOrders().
 * Includes giftcards, payments, and computed effectiveTotal.
 */
export interface BuyerOrder {
  id: string;
  status: OrderStatus;
  total: number;
  adjustedTotal: number | null;
  buyRate: number;
  createdAt: string;
  updatedAt: string;
  giftcards: BuyerOrderGiftcard[];
  payments: BuyerOrderPayment[];
  /** Sum of effective values of all cards (using buyer's rate). $0 if all cards INVALID/ALREADY_USED/DEACTIVATED. */
  effectiveTotal: number;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginatedBuyerOrders {
  orders: BuyerOrder[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

// ── BuyerOrdersView ───────────────────────────────────────────────────────────

export interface BuyerOrdersViewProps {
  orders: BuyerOrder[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
  currentFilters: {
    status?: OrderStatus | "ALL";
    search?: string;
    sort: "newest" | "oldest";
  };
}

// ── Effective Amount Calculation ──────────────────────────────────────────────

export interface BuyerOrderEffectiveAmount {
  orderId: string;
  effectiveAmount: number;
  breakdown: {
    cardId: string;
    effectiveValue: number;
  }[];
}
