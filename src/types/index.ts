// ─────────────────────────────────────────────────────────────────────────────
// Types — Central barrel export
// Import from "@/types" to access all shared project types.
//
// Example:
//   import type { Brand, Country, BuyFlowGiftcardStatus } from "@/types";
// ─────────────────────────────────────────────────────────────────────────────

// ── catalog/ ──────────────────────────────────────────────────────────────────

export type { Brand, Country } from './catalog/brand';

// ── giftcard/ ────────────────────────────────────────────────────────────────

export { giftcardSchema, giftcardStatusEnum } from './giftcard/giftcard';
export type { GiftcardStatus, Giftcard, ParsedGiftcard } from './giftcard/giftcard';
export type { GiftcardIssue } from './giftcard/issues';
export type { ClaimCodeParseResult } from './giftcard/claim-code';

// ── order/ ───────────────────────────────────────────────────────────────────

export { orderStatusEnum } from './order/buyer-order';
export type { OrderStatus, BuyerOrder } from './order/buyer-order';

export { paymentSchema, paymentStatusEnum } from './order/payments';
export type { Payment, PaymentStatus } from './order/payments';

export type { PaginatedBuyerOrders, PaginationInfo, BuyerOrderEffectiveAmount } from './order/pagination';

export type { OrderSearchParams, OrderSearchParamsKeys } from './order/search-params';

export { orderSearchParamsParsers } from './order/search-params';

// ── seller/ ─────────────────────────────────────────────────────────────────

export type { SellerBatch } from './seller/batch';

// ── sell/ ───────────────────────────────────────────────────────────────────

export { validationStateEnum, validationResultSchema } from './sell/validation';
export type { ValidationState, ValidationResult, OCRDraftCard, OCRIngestOutput } from './sell/validation';
export type {
  uploadProvenanceImageInputSchema,
  validateGiftCardImagesInputSchema,
  validateGiftCardImagesOutputSchema,
  extractDraftBatchInputSchema,
  extractDraftBatchOutputSchema,
} from './sell/validation';

// ── flows/ ──────────────────────────────────────────────────────────────────

export type { BuyFlowGiftcardStatus, BuyFlowGiftcard, BuyFlowState } from './flows/buy-flow';
export type {
  SellFlowGiftcard,
  SellFlowImage,
  SellFlowState,
  SellFlowCardEvidence,
  SellFlowUnmatchedImage,
  RemovedCardSnapshot,
} from './flows/sell-flow';

// ── ui/ ─────────────────────────────────────────────────────────────────────

export type { NavItemIcon, NavItem } from './ui/navigation';
export type { StatsItem } from './ui/feedback';
export type { CardStatusInput } from './ui/cards';

// ── auth/ ───────────────────────────────────────────────────────────────────

export type { ProfileState, ForgotPasswordState, ResendState, Portal } from './auth/states';

export type {
  ProfileFormProps,
  Verify2FAFormProps,
  LoginFormProps,
  RegisterFormProps,
  SecuritySectionProps,
  ProfileInfoSectionProps,
  TwoFactorSectionProps,
} from './auth/props';

// ── email/ ─────────────────────────────────────────────────────────────────

export type { VerifyEmailProps, ResetPasswordProps } from './email/templates';

// ── server/ ─────────────────────────────────────────────────────────────────
// Server-only types (Prisma/Decimal). Do NOT import in Client Components.

export type { GiftcardSelectionResult, BatchInfo, PreprocessedBatchData } from './server/batch-processing';

// ── Platform Settings ────────────────────────────────────────────────────────

export type { PlatformSetting } from './platform/schemas';
