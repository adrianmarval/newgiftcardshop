// ─────────────────────────────────────────────────────────────────────────────
// Order — Entity types
// ─────────────────────────────────────────────────────────────────────────────

import type { OrderStatus } from '@/generated/prisma/enums';
import type { Giftcard } from '@/types/domain/giftcard';
import type { Payment } from '@/types/domain/payment';

export { OrderStatus };

// ── BuyerOrder ─────────────────────────────────────────────────────────────────

export interface BuyerOrder {
  id: string;
  status: OrderStatus;
  total: number;
  adjustedTotal: number | null;
  buyRate: number;
  createdAt: string;
  updatedAt: string;
  giftcards: Giftcard[];
  payments: Payment[];
  effectiveTotal: number;
  faceValueTotal: number;
  brandCountryId?: string;
  /** true when the order has unconfirmed cards and the buyer hasn't unlocked codes (claimCodes are masked). */
  codesLocked?: boolean;
}

// ── RecentOrder (for dashboard) ────────────────────────────────────────────────

export interface RecentOrder {
  id: string;
  status: OrderStatus;
  total: number;
  adjustedTotal: number | null;
  createdAt: string;
  cardsCount: number;
  faceValueTotal: number;
  effectiveTotal: number;
  giftcards: Array<{ id: string; amount: number; brand: { name: string; icon: string; image: string | null } }>;
}

// --- AdminOrder ──────────────────────────────────────────────────────────────

export interface AdminOrder {
  id: string;
  status: OrderStatus;
  total: number;
  adjustedTotal: number | null;
  buyRate: number;
  createdAt: string;
  updatedAt: string;
  giftcards: (Giftcard & {
    seller?: { id: string; name: string; email: string } | null;
  })[];
  payments: Payment[];
  effectiveTotal: number;
  faceValueTotal: number;
  buyer: {
    id: string;
    name: string;
    email: string;
    buyRate: number;
    orderCount: number;
    createdAt: string;
    twoFactorEnabled: boolean;
  };
}


