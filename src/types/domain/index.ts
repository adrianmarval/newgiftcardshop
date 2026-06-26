// ─────────────────────────────────────────────────────────────────────────────
// Domain — Barrel export
// Only cross-feature domain types live here.
// Note: Enums are imported directly from '@/generated/prisma/enums'
// ─────────────────────────────────────────────────────────────────────────────

// Core entities
export * from './giftcard';
export * from './payment';
export * from './order';
export * from './brand-country';

// Entity collections
export * from './batch';

// Escalation
export * from './escalation';

// Browse / Selection
export type {
  GiftcardSelectionResult,
  BatchInfo,
  PreprocessedBatchData,
  GiftcardSelectionWithTierInfo,
} from './giftcard';
