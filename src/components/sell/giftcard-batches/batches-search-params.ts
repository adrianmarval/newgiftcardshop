// ─────────────────────────────────────────────────────────────────────────────
// Batch Types — Search params parsers for seller batches (nuqs v2)
// ─────────────────────────────────────────────────────────────────────────────

import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';

// ── Parser Definitions ────────────────────────────────────────────────────────

export const batchSearchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  status: parseAsStringLiteral(['ALL', 'PROCESSING', 'CONFIRMED', 'PAID', 'REPORTED'] as const).withDefault('ALL'),
  search: parseAsString.withDefault(''),
  sort: parseAsStringLiteral(['newest', 'oldest'] as const).withDefault('newest'),
} as const;

// ── Derived Types ─────────────────────────────────────────────────────────────

export type BatchSearchParams = {
  page: number;
  status: 'ALL' | 'PROCESSING' | 'CONFIRMED' | 'PAID' | 'REPORTED';
  search: string;
  sort: 'newest' | 'oldest';
};

export type BatchSearchParamsKeys = keyof typeof batchSearchParamsParsers;
