// ─────────────────────────────────────────────────────────────────────────────
// Search Params — Orders
// Server-side parsers for order list URL search params.
// ─────────────────────────────────────────────────────────────────────────────

import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';

export const orderSearchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  status: parseAsStringLiteral(['ALL', 'PENDING', 'AWAITING_PAYMENT', 'COMPLETED', 'CANCELLED'] as const).withDefault('ALL'),
  search: parseAsString.withDefault(''),
  sort: parseAsStringLiteral(['newest', 'oldest'] as const).withDefault('newest'),
} as const;

export type OrderSearchParams = {
  page: number;
  status: 'ALL' | 'PENDING' | 'AWAITING_PAYMENT' | 'COMPLETED' | 'CANCELLED';
  search: string;
  sort: 'newest' | 'oldest';
};
