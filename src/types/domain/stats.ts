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

export interface BuyerStats {
  availableCards: number;
  availableAmount: number;
  orderBook: OrderBookData;
}

export interface SellerStats {
  totalCards: number;
  totalBatches: number;
  paidBatches: number;
  unpaidBatches: number;
}