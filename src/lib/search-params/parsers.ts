// ─────────────────────────────────────────────────────────────────────────────
// Search Params — URL parsers for admin/store/seller list pages
// Centralized to avoid 8 fragmented files. Each parser maps 1:1 to a list page.
// ─────────────────────────────────────────────────────────────────────────────

import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';
import { createSearchParamsCache } from 'nuqs/server';

// ── Orders ───────────────────────────────────────────────────────────────────

export const orderSearchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  status: parseAsStringLiteral(['ALL', 'PENDING', 'AWAITING_PAYMENT', 'COMPLETED', 'CANCELLED'] as const).withDefault('ALL'),
  search: parseAsString.withDefault(''),
  sort: parseAsStringLiteral(['newest', 'oldest'] as const).withDefault('newest'),
} as const;

export const adminOrdersSearchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(10),
  buyerId: parseAsString.withDefault(''),
  status: parseAsStringLiteral(['ALL', 'PENDING', 'AWAITING_PAYMENT', 'COMPLETED', 'CANCELLED'] as const).withDefault('ALL'),
  search: parseAsString.withDefault(''),
  dateFrom: parseAsString.withDefault(''),
  dateTo: parseAsString.withDefault(''),
} as const;

// ── Batches ──────────────────────────────────────────────────────────────────

export const sellerBatchesSearchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  status: parseAsStringLiteral(['ALL', 'PROCESSING', 'CONFIRMED', 'PAID', 'CANCELLED', 'REPORTED'] as const).withDefault('ALL'),
  search: parseAsString.withDefault(''),
  sort: parseAsStringLiteral(['newest', 'oldest'] as const).withDefault('newest'),
} as const;

export const adminBatchesSearchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(10),
  sellerId: parseAsString.withDefault(''),
  status: parseAsStringLiteral(['ALL', 'PROCESSING', 'CONFIRMED', 'PAID', 'CANCELLED', 'WITH_ISSUES'] as const).withDefault('ALL'),
  search: parseAsString.withDefault(''),
  sort: parseAsStringLiteral(['newest', 'oldest', 'amount_high', 'amount_low'] as const).withDefault('newest'),
  dateFrom: parseAsString.withDefault(''),
  dateTo: parseAsString.withDefault(''),
  amountMin: parseAsString.withDefault(''),
  amountMax: parseAsString.withDefault(''),
} as const;

// ── Admin: Users, Payments, Logs ─────────────────────────────────────────────

export const adminIssuesSearchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(10),
  issueType: parseAsStringLiteral(['ALL', 'INVALID', 'ALREADY_USED', 'DEACTIVATED', 'WRONG_AMOUNT'] as const).withDefault('ALL'),
  search: parseAsString.withDefault(''),
  sort: parseAsStringLiteral(['newest', 'oldest'] as const).withDefault('newest'),
  sellerId: parseAsString.withDefault(''),
  buyerId: parseAsString.withDefault(''),
  dateFrom: parseAsString.withDefault(''),
  dateTo: parseAsString.withDefault(''),
} as const;

export const adminUsersSearchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(10),
  search: parseAsString.withDefault(''),
  role: parseAsStringLiteral(['ALL', 'ADMIN', 'SELLER', 'BUYER'] as const).withDefault('ALL'),
  isActive: parseAsStringLiteral(['ALL', 'true', 'false'] as const).withDefault('ALL'),
} as const;

export const adminPaymentsSearchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(20),
  direction: parseAsStringLiteral(['ALL', 'CREDIT', 'DEBIT'] as const).withDefault('ALL'),
  category: parseAsStringLiteral(['ALL', 'ORDER', 'BATCH', 'DEPOSIT', 'REFUND_BUYER', 'REFUND_SELLER'] as const).withDefault('ALL'),
  userId: parseAsString.withDefault(''),
  search: parseAsString.withDefault(''),
  dateFrom: parseAsString.withDefault(''),
  dateTo: parseAsString.withDefault(''),
} as const;

export const adminLogsSearchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(10),
  level: parseAsStringLiteral(['ALL', 'info', 'warn', 'error', 'debug'] as const).withDefault('ALL'),
  source: parseAsStringLiteral(['ALL', 'web', 'seller-bot', 'buyer-bot', 'cron', 'system'] as const).withDefault('ALL'),
  flow: parseAsStringLiteral(['ALL', 'sell', 'buy', 'order', 'payment', 'batch', 'auth', 'admin'] as const).withDefault('ALL'),
  search: parseAsString.withDefault(''),
  userId: parseAsString.withDefault(''),
  dateFrom: parseAsString.withDefault(''),
  dateTo: parseAsString.withDefault(''),
} as const;

// ── Server-side caches ───────────────────────────────────────────────────────

export const orderSearchParamsCache = createSearchParamsCache(orderSearchParamsParsers);
export const adminBatchesSearchParamsCache = createSearchParamsCache(adminBatchesSearchParamsParsers);
export const adminOrdersSearchParamsCache = createSearchParamsCache(adminOrdersSearchParamsParsers);
export const adminIssuesSearchParamsCache = createSearchParamsCache(adminIssuesSearchParamsParsers);
export const adminUsersSearchParamsCache = createSearchParamsCache(adminUsersSearchParamsParsers);
export const adminPaymentsSearchParamsCache = createSearchParamsCache(adminPaymentsSearchParamsParsers);
export const adminLogsSearchParamsCache = createSearchParamsCache(adminLogsSearchParamsParsers);
export const sellerBatchesSearchParamsCache = createSearchParamsCache(sellerBatchesSearchParamsParsers);