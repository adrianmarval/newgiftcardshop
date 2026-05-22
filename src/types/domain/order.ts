// ─────────────────────────────────────────────────────────────────────────────
// Order — Entity types
// ─────────────────────────────────────────────────────────────────────────────

import type { OrderStatus } from '@/generated/prisma/enums';
import { Giftcard } from '@/types/domain/giftcard';
import { Payment } from '@/types/domain/payment';

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

// ── Buyer Stats ───────────────────────────────────────────────────────────────

export interface BuyerStats {
  availableCards: number;
  myOrders: number;
  activeOrders: number;
  totalSaved: number;
}
