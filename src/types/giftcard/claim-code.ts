// ─────────────────────────────────────────────────────────────────────────────
// Claim Code Types — Parser result types for bulk-paste import
// Zero UI dependencies — safe to import on server or client.
// ─────────────────────────────────────────────────────────────────────────────

import type { ParsedGiftcard } from './giftcard';

/**
 * Result returned by `parseClaimCodes()`.
 * `parsed` contains unique, canonical-formatted cards.
 * `errors` lists human-readable issues for lines that could not be parsed.
 * `duplicateCount` is the number of intra-paste duplicates that were ignored.
 */
export interface ClaimCodeParseResult {
  parsed: ParsedGiftcard[];
  errors: string[];
  duplicateCount: number;
}
