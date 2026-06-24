// ─────────────────────────────────────────────────────────────────────────────
// Giftcard — Core entity types
// ─────────────────────────────────────────────────────────────────────────────

import type { GiftcardStatus, GiftcardIssueType } from '@/generated/prisma/enums';

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
