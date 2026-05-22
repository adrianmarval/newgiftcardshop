// ─────────────────────────────────────────────────────────────────────────────
// Search Params — Seller Batches
// Server-side parsers for seller batch list URL search params.
// ─────────────────────────────────────────────────────────────────────────────

import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';

export const sellerBatchesSearchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  status: parseAsStringLiteral(['ALL', 'PROCESSING', 'CONFIRMED', 'PAID', 'REPORTED'] as const).withDefault('ALL'),
  search: parseAsString.withDefault(''),
  sort: parseAsStringLiteral(['newest', 'oldest'] as const).withDefault('newest'),
} as const;

export type SellerBatchesSearchParams = {
  page: number;
  limit: number;
  status: 'ALL' | 'PROCESSING' | 'CONFIRMED' | 'PAID' | 'REPORTED';
  search: string;
  sort: 'newest' | 'oldest';
};
