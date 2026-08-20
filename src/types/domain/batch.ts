// ─────────────────────────────────────────────────────────────────────────────
// Batch — GiftcardBatch entity types (Seller's batch of giftcards)
// ─────────────────────────────────────────────────────────────────────────────

import { OrderStatus } from '@/generated/prisma/enums';
import type { Giftcard } from './giftcard';
import type { Payment } from './payment';

// ── SellerBatch ───────────────────────────────────────────────────────────────

export interface SellerBatch {
  id: number;
  userId: string | null;
  sellRate: number;
  isPaid: boolean;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  giftcards: Giftcard[];
  payments: Payment[];
  effectiveTotal: number;
  estimatedPayout: number;
  cardsCount?: number;
  confirmedCount?: number;
  paidCount?: number;
  hasIssues?: boolean;
}

// ── RecentBatch (for dashboard) ────────────────────────────────────────────────

export interface RecentBatch {
  id: number;
  sellRate: number;
  isPaid: boolean;
  cancelledAt: string | null;
  createdAt: string;
  giftcards: Array<{ id: string; amount: number; brand: { name: string; icon: string; image: string | null } }>;
  cardsCount: number;
  confirmedCount: number;
  effectiveTotal: number;
}

// ---- AdminBatch (for admin dashboard) ────────────────────────────────────────────────

// ── Admin Batch ───────────────────────────────────────────────────────────────

export interface AdminBatch {
  id: number;
  sellRate: number;
  isPaid: boolean;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  seller: {
    id: string;
    name: string;
    email: string;
    sellRate: number;
    orderCount: number;
    createdAt: string;
    twoFactorEnabled: boolean;
  };
  giftcards: (Giftcard & {
    reportedAmount?: number | null;
    orderId?: string | null;
    buyer?: { id: string; name: string; email: string } | null;
    order?: { id: string; status: OrderStatus } | null;
    issues?: unknown[] | null;
  })[];
  payments: Payment[];
  effectiveTotal: number;
  estimatedPayout: number;
  cardsCount: number;
  confirmedCount: number;
  paidCount: number;
  hasIssues: boolean;
  currency?: string;
}
