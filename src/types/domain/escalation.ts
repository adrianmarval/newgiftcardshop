// ─────────────────────────────────────────────────────────────────────────────
// Escalation — Tier escalation config + estimation result types
// ─────────────────────────────────────────────────────────────────────────────

import type { Decimal } from '@prisma/client/runtime/client';

export interface EscalationConfig {
  enabled: boolean;
  durationMinutes: number;
  dropAmount: number;
}

export interface TierInfo {
  buyerBuyRate: number;
  accessibleAmount: string;
  totalAvailableAmount: string;
  tiers: { tier: number; amount: string }[];
}

export interface TierDropEvent {
  giftcardId: string;
  brandCountryId: string;
  oldTier: number;
  newTier: number;
}

export interface TierEstimationResult {
  minMinutes: number;
  nextCardTier: number;
  totalInaccessible: number;
  totalInaccessibleAmount: Decimal;
}

export interface AccessibleStockSummary {
  totalAmount: Decimal;
  cardCount: number;
}