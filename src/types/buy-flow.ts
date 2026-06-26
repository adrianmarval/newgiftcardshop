// ─────────────────────────────────────────────────────────────────────────────
// Buy Flow — Data types (shared between hooks and components)
// ─────────────────────────────────────────────────────────────────────────────

import type { GiftcardStatus } from '@/generated/prisma/enums';

export interface BuyFlowCard {
  id: string;
  brand: string;
  amount: number;
  claimCode?: string;
  pinCode?: string;
  status: GiftcardStatus;
  reportedAmount?: number;
  sellerId?: string;
  country?: { name: string; code: string; currency: string | null } | null;
}

export interface BuyFlowTierInfo {
  buyerBuyRate: number;
  accessibleAmount: string;
  inaccessibleAmount: string;
  totalCards: number;
  accessibleCardCount: number;
  inaccessibleCardCount: number;
  nextCardTier?: number;
  estimatedMinutes?: number;
}
