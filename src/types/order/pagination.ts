// ─────────────────────────────────────────────────────────────────────────────
// Order Types — Pagination types for buyer orders
// ─────────────────────────────────────────────────────────────────────────────

import type { BuyerOrder } from './buyer-order';

// ── UI Pagination (generic) ────────────────────────────────────────────────────

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

// ── Paginated Orders ─────────────────────────────────────────────────────────

export interface PaginatedBuyerOrders {
  orders: BuyerOrder[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface BuyerOrderEffectiveAmount {
  orderId: string;
  effectiveAmount: number;
  breakdown: {
    cardId: string;
    effectiveValue: number;
  }[];
}
