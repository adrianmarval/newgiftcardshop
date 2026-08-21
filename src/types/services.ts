// ─────────────────────────────────────────────────────────────────────────────
// Service interfaces — Shared contracts between services, actions, and bots
// ─────────────────────────────────────────────────────────────────────────────

import type { Prisma } from '@/generated/prisma/client';
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