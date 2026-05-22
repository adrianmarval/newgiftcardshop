// ─────────────────────────────────────────────────────────────────────────────
// Search Params — Admin Orders
// Server-side parsers for admin order list URL search params.
// ─────────────────────────────────────────────────────────────────────────────

import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';

export const adminOrdersSearchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(10),
  buyerId: parseAsString.withDefault(''),
  status: parseAsStringLiteral(['ALL', 'PENDING', 'AWAITING_PAYMENT', 'COMPLETED', 'CANCELLED'] as const).withDefault('ALL'),
  search: parseAsString.withDefault(''),
  dateFrom: parseAsString.withDefault(''),
  dateTo: parseAsString.withDefault(''),
} as const;

export type AdminOrdersSearchParams = {
  page: number;
  limit: number;
  buyerId: string;
  status: 'ALL' | 'PENDING' | 'AWAITING_PAYMENT' | 'COMPLETED' | 'CANCELLED';
  search: string;
  dateFrom: string;
  dateTo: string;
};
