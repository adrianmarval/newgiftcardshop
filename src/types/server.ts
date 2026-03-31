// ─────────────────────────────────────────────────────────────────────────────
// Server Types — types that depend on Prisma or Decimal.
// These MUST NOT be imported into Client Components.
// ─────────────────────────────────────────────────────────────────────────────

import type { Giftcard } from "@/generated/prisma/client";
import type { Decimal } from "@prisma/client/runtime/client";

// ── browse-giftcards ──────────────────────────────────────────────────────────

export interface GiftcardSelectionResult {
  selectedCards: Giftcard[];
  total: Decimal;
  isExactMatch: boolean;
  isWithinToleranceRange: boolean;
}

export interface BatchInfo {
  createdAt: Date;
  cards: Giftcard[];
  totalValue: Decimal;
}

export interface PreprocessedBatchData {
  batches: BatchInfo[];
  allCardsByAge: Giftcard[];
  totalCards: number;
}
