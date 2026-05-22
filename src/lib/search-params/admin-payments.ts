// ─────────────────────────────────────────────────────────────────────────────
// Search Params — Admin Payments
// Server-side parsers for admin payment list URL search params.
// ─────────────────────────────────────────────────────────────────────────────

import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';

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

export type AdminPaymentsSearchParams = {
  page: number;
  limit: number;
  direction: 'ALL' | 'CREDIT' | 'DEBIT';
  category: 'ALL' | 'ORDER' | 'BATCH' | 'DEPOSIT' | 'REFUND_BUYER' | 'REFUND_SELLER';
  userId: string;
  search: string;
  dateFrom: string;
  dateTo: string;
};
