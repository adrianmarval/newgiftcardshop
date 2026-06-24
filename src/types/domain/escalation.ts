// ─────────────────────────────────────────────────────────────────────────────
// Escalation — Tier escalation config types
// ─────────────────────────────────────────────────────────────────────────────

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
