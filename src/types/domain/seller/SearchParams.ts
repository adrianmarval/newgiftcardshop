// ─────────────────────────────────────────────────────────────────────────────
// Seller Batches — Search params y schemas (nuqs v2 + Zod)
// Todos los parsers y schemas de filtrado para batches del seller.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';

// ── nuqs parsers (para URL search params y useQueryStates) ──────────────────

export const sellerBatchesSearchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  status: parseAsStringLiteral(['ALL', 'PROCESSING', 'CONFIRMED', 'PAID', 'REPORTED'] as const).withDefault('ALL'),
  search: parseAsString.withDefault(''),
  sort: parseAsStringLiteral(['newest', 'oldest'] as const).withDefault('newest'),
} as const;

export type SellerBatchesSearchParams = {
  page: number;
  status: 'ALL' | 'PROCESSING' | 'CONFIRMED' | 'PAID' | 'REPORTED';
  search: string;
  sort: 'newest' | 'oldest';
};

export type SellerBatchesSearchParamsKeys = keyof typeof sellerBatchesSearchParamsParsers;

// ── Zod input schema (para server action) ────────────────────────────────────

export const getSellerBatchesInputSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
  status: z.enum(['ALL', 'PROCESSING', 'CONFIRMED', 'PAID', 'REPORTED']).optional().default('ALL'),
  search: z.string().optional(),
  sort: z.enum(['newest', 'oldest']).optional().default('newest'),
});

export type GetSellerBatchesInput = z.infer<typeof getSellerBatchesInputSchema>;
