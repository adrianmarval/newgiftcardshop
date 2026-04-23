// ─────────────────────────────────────────────────────────────────────────────
// Giftcard — Barrel export
// ─────────────────────────────────────────────────────────────────────────────

export { giftcardStatusEnum, giftcardSchema } from './Giftcard';
export type { GiftcardStatus, Giftcard } from './Giftcard';

export type { ClaimCodeParseResult, ParsedGiftcard, ParseClaimCodesResult } from './ClaimCode';
export { normalizeClaimCode } from './ClaimCode';

export { giftcardIssueSchema } from './GiftcardIssue';
export type { GiftcardIssue } from './GiftcardIssue';
