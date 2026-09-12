// ─────────────────────────────────────────────────────────────────────────────
// Giftcard — Core entity types
// ─────────────────────────────────────────────────────────────────────────────

import type { GiftcardStatus, GiftcardIssueType, OrderStatus } from '@/generated/prisma/enums';
import type { AdminBuyerSummary, AdminSellerSummary } from './user';

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
  /** Issue activo de la card (si fue reportada) — alimenta el attach tardío de evidencia desde el historial. */
  issue?: { id: string; hasProof: boolean } | null;
  /** Tiene imagen de procedencia (FK o link plano ProvenanceImage.giftcardId) — alimenta el attach tardío del seller. */
  hasProvenanceImage?: boolean;
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

// ── Admin: GiftcardIssue (list view) ─────────────────────────────────────────

export interface AdminGiftcardIssue {
  id: string;
  issueType: GiftcardIssueType;
  reportedAmount: number | null;
  /** True when the buyer attached a proof screenshot (Telegram file_id). Fetched lazily via getIssueProof. */
  hasProof: boolean;
  createdAt: string;
  /** Full card with decrypted claimCode — admin scope never masks codes. */
  giftcard: Giftcard;
  order: { id: string; status: OrderStatus; total: number };
  buyer: AdminBuyerSummary;
  seller: AdminSellerSummary | null;
  isSearchMatch?: boolean;
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
  country: { name: string; code: string; currency: string | null } | null;
  isSearchMatch: boolean;
  /** Issue activo de la card (si fue reportada) — alimenta el attach tardío de evidencia desde el historial. */
  issue?: { id: string; hasProof: boolean } | null;
  seller: import('./user').AdminSellerSummary | null;
}