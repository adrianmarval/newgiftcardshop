// ─────────────────────────────────────────────────────────────────────────────
// Search Params — Admin Batches
// Server-side parsers for admin batch list URL search params.
// ─────────────────────────────────────────────────────────────────────────────

import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';

export const adminBatchesSearchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(10),
  sellerId: parseAsString.withDefault(''),
  status: parseAsStringLiteral(['ALL', 'PROCESSING', 'CONFIRMED', 'PAID', 'WITH_ISSUES'] as const).withDefault('ALL'),
  search: parseAsString.withDefault(''),
  sort: parseAsStringLiteral(['newest', 'oldest', 'amount_high', 'amount_low'] as const).withDefault('newest'),
  dateFrom: parseAsString.withDefault(''),
  dateTo: parseAsString.withDefault(''),
  amountMin: parseAsString.withDefault(''),
  amountMax: parseAsString.withDefault(''),
} as const;

export type AdminBatchesSearchParams = {
  page: number;
  limit: number;
  sellerId: string;
  status: 'ALL' | 'PROCESSING' | 'CONFIRMED' | 'PAID' | 'WITH_ISSUES';
  search: string;
  sort: 'newest' | 'oldest' | 'amount_high' | 'amount_low';
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
};
