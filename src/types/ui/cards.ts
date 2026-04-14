// ─────────────────────────────────────────────────────────────────────────────
// UI Types — Card and giftcard-related UI components
// ─────────────────────────────────────────────────────────────────────────────

import type { OrderStatus } from "@/types/order/buyer-order";
import type { BuyerOrderPayment } from "@/types/order/buyer-order";

// ── Card Status Badge ─────────────────────────────────────────────────────────

/**
 * Minimal shape required by CardStatusBadge.
 * Both Giftcard (seller) and BuyerOrderGiftcard (buyer) satisfy this.
 */
export interface CardStatusInput {
  isConfirmed: boolean;
  status: string;
  orderId: string | null;
}

export interface GiftcardStatusBadgeProps {
  card: CardStatusInput;
  orderStatus?: OrderStatus;
}

// ── GiftcardIssueAlert ────────────────────────────────────────────────────────

export interface GiftcardIssueAlertProps {
  status: string;
}

// ── TransactionList ───────────────────────────────────────────────────────────

export interface TransactionListProps {
  payments: BuyerOrderPayment[];
}

// ── UrlPagination ─────────────────────────────────────────────────────────────

export interface UrlPaginationProps {
  totalPages: number;
}

// ── MetricCardGrid ────────────────────────────────────────────────────────────

import type { StatsItem } from "./feedback";

export interface MetricCardGridProps {
  items: StatsItem[];
}
