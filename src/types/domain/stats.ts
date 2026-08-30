// ─────────────────────────────────────────────────────────────────────────────
// Stats — Dashboard aggregate types (computed views, not raw entities)
// ─────────────────────────────────────────────────────────────────────────────

import type { OrderStatus } from '@/generated/prisma/enums';

export interface OrderBookEntry {
  orderId: string;
  buyerEmail: string;
  cardCount: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
}

export interface OrderBookData {
  totalOrdersToday: number;
  totalTradedToday: number;
  entries: OrderBookEntry[];
}

export interface BuyerPersonalStats {
  creditLimit: number;
  unpaidFaceValue: number;
  unpaidUsdt: number;
  availableCredit: number;
  pendingOrdersCount: number;
  totalSaved: number;
  monthSpend: number;
  monthOrdersCount: number;
  reportedIssues: number;
}

export interface BuyerStats {
  orderBook: OrderBookData;
  personal: BuyerPersonalStats;
}

export interface SellerStats {
  pendingPayout: number;
  totalEarned: number;
  inStockValue: number;
  problemCards: number;
}