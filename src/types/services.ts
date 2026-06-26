// ─────────────────────────────────────────────────────────────────────────────
// Service interfaces — Shared contracts between services, actions, and bots
// ─────────────────────────────────────────────────────────────────────────────

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
