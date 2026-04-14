// ─────────────────────────────────────────────────────────────────────────────
// Order Types — Pagination types for buyer orders
// ─────────────────────────────────────────────────────────────────────────────

import type { BuyerOrder } from './buyer-order';

export interface PaginatedBuyerOrders {
  orders: BuyerOrder[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface BuyerOrdersViewProps {
  orders: BuyerOrder[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface BuyerOrderEffectiveAmount {
  orderId: string;
  effectiveAmount: number;
  breakdown: {
    cardId: string;
    effectiveValue: number;
  }[];
}

// ── UI Pagination (generic) ────────────────────────────────────────────────────

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
}
