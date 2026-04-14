// ─────────────────────────────────────────────────────────────────────────────
// Types — Central barrel export
// Import from "@/types" to access all shared project types.
//
// Example:
//   import type { Brand, Country, BuyGiftcardStatus } from "@/types";
// ─────────────────────────────────────────────────────────────────────────────

// ── catalog/ ──────────────────────────────────────────────────────────────────

export type { Brand, Country } from './catalog/brand';

// ── giftcard/ ────────────────────────────────────────────────────────────────

export type { GiftcardStatus, Giftcard, ParsedGiftCard } from './giftcard/giftcard';
export type { GiftcardIssue } from './giftcard/issues';

// ── order/ ───────────────────────────────────────────────────────────────────

export type { OrderStatus, BuyerOrder, BuyerOrderGiftcard, BuyerOrderPayment } from './order/buyer-order';

export type { Payment } from './order/payments';

export type { PaginatedBuyerOrders, PaginationInfo, BuyerOrdersViewProps, BuyerOrderEffectiveAmount } from './order/pagination';

export type { OrderSearchParams, OrderSearchParamsKeys } from './order/search-params';

export { orderSearchParamsParsers } from './order/search-params';

// ── seller/ ─────────────────────────────────────────────────────────────────

export type { SellerBatch, SellerBatchCard, SellerBatchPayment } from './seller/batch';

// ── flows/ ──────────────────────────────────────────────────────────────────

export type { BuyGiftcardStatus, BuyGiftcardItem, BuyFlowState } from './flows/buy-flow';
export type { GiftCardItem, SellFlowState } from './flows/sell-flow';

// ── ui/ ─────────────────────────────────────────────────────────────────────

export type { NavItemIcon, NavItem, PortalSidebarProps } from './ui/navigation';
export type { StatsItem, EmptyStateProps, CodeDisplayProps } from './ui/feedback';
export type {
  CardStatusInput,
  GiftcardStatusBadgeProps,
  GiftcardIssueAlertProps,
  TransactionListProps,
  UrlPaginationProps,
  MetricCardGridProps,
} from './ui/cards';

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

export type { PlatformSetting } from './platform/actions';

// ── Sell component props (from original sell.ts) ─────────────────────────────

import type { SellerBatch } from './seller/batch';
import type { Brand, Country } from './catalog/brand';
import type { ParsedGiftCard } from './giftcard/giftcard';
import type { BuyerOrder, BuyerOrderGiftcard, OrderStatus } from './order/buyer-order';

export interface SellerCardsViewProps {
  batches: SellerBatch[];
}

export interface SellBatchManagerProps {
  brands: Brand[];
  countries: Country[];
  sellRate: number;
}

export interface BrandStepProps {
  brands: Brand[];
  countries: Country[];
}

export interface ReviewStepProps {
  onPublish: () => void;
  isPublishing?: boolean;
  brandName: string;
  countryName: string;
  sellRate: number;
}

export interface BulkPasteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (cards: ParsedGiftCard[]) => void;
}

// ── Order component props (Phase 2 additions) ────────────────────────────────

export interface OrdersStatsProps {
  orders: BuyerOrder[];
  totalCount: number;
}

export interface OrdersListProps {
  orders: BuyerOrder[];
  totalPages: number;
  onCardClick?: (card: BuyerOrderGiftcard, orderStatus: OrderStatus) => void;
}

export interface OrderDetailsProps {
  order: BuyerOrder;
  canCancel: boolean;
  onCardClick?: (card: BuyerOrderGiftcard, orderStatus: BuyerOrder['status']) => void;
}

export interface CardDetailDialogProps {
  card: BuyerOrderGiftcard | null;
  orderStatus: OrderStatus | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface OrdersFiltersProps {
  onSearchChange?: (search: string) => void;
}

export interface OrderCardProps {
  order: BuyerOrder;
  onCardClick?: (card: BuyerOrderGiftcard, orderStatus: OrderStatus) => void;
}

export interface SearchStepProps {
  brands: Brand[];
  countries: Country[];
}

export interface BuyGiftcardManagerProps {
  brands: Brand[];
  countries: Country[];
  /** When present, hydrates the store to resume this order. When absent, resets to step 1. */
  resumeOrder?: BuyerOrder | null;
}
