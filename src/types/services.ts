// ─────────────────────────────────────────────────────────────────────────────
// Service interfaces — Shared contracts between services, actions, and bots
// ─────────────────────────────────────────────────────────────────────────────

import type { Prisma } from '@/generated/prisma/client';
import type { Giftcard as PrismaGiftcard } from '@/generated/prisma/client';
import type { Decimal } from '@prisma/client/runtime/client';
import type { GiftcardStatus } from '@/generated/prisma/enums';

// ── Batch Publish ───────────────────────────────────────────────────────────

export interface PublishCardInput {
  amount: string;
  claimCode: string;
  pinCode?: string;
  compressedImageData?: string;
}

export interface PublishResult {
  batchId: number;
  duplicates: string[];
  totalPublished: number;
}

export interface PublishContext {
  userId: string;
  brandId: string;
  countryId: string;
  cards: PublishCardInput[];
  unmatchedImages?: Array<{ data: string }>;
}

// ── Order Issue Reporting ───────────────────────────────────────────────────

export interface ReportIssueParams {
  giftcardId: string;
  orderId: string;
  userId: string;
  issueType: string;
  reportedAmount?: number;
  proofImageUrl?: string;
  /** Web upload: screenshot comprimido y cifrado AES-256-GCM (el bot usa proofImageUrl con file_id). */
  proofData?: Uint8Array<ArrayBuffer>;
  proofMimeType?: string;
}

// ── Order List Service ──────────────────────────────────────────────────────

export interface ListOrdersServiceInput {
  scope: 'admin' | 'buyer';
  /** Required for scope='buyer'. Ignored for scope='admin' (returns all). */
  userId?: string;
  /** Admin-only: filter by specific buyer. */
  buyerId?: string | null;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  dateFrom?: string | null;
  dateTo?: string | null;
  sort?: 'newest' | 'oldest';
  /** Buyer scope only: whether the buyer currently holds a valid security unlock (PIN/passkey). */
  codesUnlocked?: boolean;
}

// ── Batch List Service ──────────────────────────────────────────────────────

export interface ListBatchesServiceInput {
  scope: 'admin' | 'seller';
  /** Required for scope='seller'. Ignored for scope='admin'. */
  userId?: string;
  /** Admin-only: filter by specific seller. */
  sellerId?: string | null;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  dateFrom?: string | null;
  dateTo?: string | null;
  amountMin?: number | null;
  amountMax?: number | null;
  sort?: 'newest' | 'oldest' | 'amount_high' | 'amount_low';
}

// ── Tab counts (badges numéricos de los quick-tabs de las listas) ───────────

/** Conteos de los tabs accionables de órdenes (PENDING / AWAITING_PAYMENT). */
export interface OrderTabCounts {
  pending: number;
  awaitingPayment: number;
}

/** Conteos de los tabs accionables de lotes (PROCESSING / CONFIRMED). */
export interface BatchTabCounts {
  processing: number;
  confirmed: number;
}

// ── Credit Check ────────────────────────────────────────────────────────────

export interface CreditCheckResult {
  allowed: boolean;
  unpaidTotal: Prisma.Decimal;
  availableCredit: Prisma.Decimal;
  creditLimit: Prisma.Decimal;
}

// ── Pricing ─────────────────────────────────────────────────────────────────

/** Structural subset of Giftcard needed by pricing calculations. */
export type GiftcardLike = {
  status: GiftcardStatus;
  amount: Prisma.Decimal;
  reportedAmount: Prisma.Decimal | null;
};
// ── Claim Code Parsing (output del claim-code-parser, compartido web/bot) ────

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

// ── Browse / Selection (internals del subset-sum DP de services/browse) ──────

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
