// ─────────────────────────────────────────────────────────────────────────────
// Giftcard — Core entity types
// ─────────────────────────────────────────────────────────────────────────────

import type { GiftcardStatus, GiftcardIssueType } from '@/generated/prisma/enums';
import type { Giftcard as PrismaGiftcard } from '@/generated/prisma/client';
import type { Decimal } from '@prisma/client/runtime/client';

export { GiftcardStatus };

// ── Giftcard ─────────────────────────────────────────────────────────────────

export interface Giftcard {
  id: string;
  claimCode: string;
  pinCode: string | null;
  amount: number;
  status: GiftcardStatus;
  isConfirmed: boolean;
  reportedAmount: number | null;
  orderId: string | null;
  batchId?: number | null;
  provenanceImageId?: string | null;
  brandCountryId?: string;
  brand: { name: string; icon: string; image: string | null };
  country: { name: string; code: string; currency: string | null } | null;
  isSearchMatch?: boolean;
}

// ── GiftcardIssue ─────────────────────────────────────────────────────────────

export interface GiftcardIssue {
  id: string;
  issueType: GiftcardIssueType;
  reportedAmount: number | null;
  proofImageUrl: string | null;
  giftcardId: string;
  orderId: string;
  reportedById: string;
  sellerId: string | null;
  createdAt: string;
}

// ── Claim Code Parsing ────────────────────────────────────────────────────────

export interface ParsedGiftcard {
  amount?: string;
  claimCode: string;
  pinCode?: string;
  line?: number;
}

export interface ParseClaimCodesResult {
  parsed: ParsedGiftcard[];
  errors: string[];
  duplicateCount: number;
  duplicates: string[];
}

// ── Browse / Selection Types ──────────────────────────────────────────────────

export interface GiftcardSelectionResult {
  selectedCards: PrismaGiftcard[];
  total: Decimal;
  isExactMatch: boolean;
  isWithinToleranceRange: boolean;
}

export interface BatchInfo {
  createdAt: Date;
  cards: PrismaGiftcard[];
  totalValue: Decimal;
}

export interface PreprocessedBatchData {
  batches: BatchInfo[];
  allCardsByAge: PrismaGiftcard[];
  totalCards: number;
}

export interface GiftcardSelectionWithTierInfo extends GiftcardSelectionResult {
  tierInfo: {
    accessibleCards: PrismaGiftcard[];
    inaccessibleCards: PrismaGiftcard[];
    accessibleAmount: Decimal;
    inaccessibleAmount: Decimal;
    buyerBuyRate: number;
  };
}

// ── Serialized Giftcard (list views with seller info) ────────────────────────

export interface GiftcardForList {
  id: string;
  claimCode: string;
  pinCode: string | null;
  amount: number;
  status: GiftcardStatus;
  isConfirmed: boolean;
  reportedAmount: number | null;
  orderId: string | null;
  batchId: number | null;
  brand: { name: string; icon: string; image: string | null };
  country: { name: string; code: string; currency: string | null };
  isSearchMatch: boolean;
  seller: { id: string; name: string; email: string } | null;
}