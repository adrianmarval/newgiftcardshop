// ─────────────────────────────────────────────────────────────────────────────
// Admin Batches — Search params y schemas (nuqs v2 + Zod)
// Todos los parsers y schemas de filtrado para batches del admin.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';
import { paginatedOutputSchema } from '@/types/application/shared/Pagination';
import { adminBatchSchema } from './AdminBatch';

// ── nuqs parsers (para URL search params y useQueryStates) ──────────────────

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

export type AdminBatchesSearchParamsKeys = keyof typeof adminBatchesSearchParamsParsers;

// ── Zod input schema (para server action) ────────────────────────────────────

export const getAdminBatchesInputSchema = z.object({
  sellerId: z.string().nullable().optional(),
  status: z.enum(['ALL', 'PROCESSING', 'CONFIRMED', 'PAID', 'WITH_ISSUES']).optional().default('ALL'),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  amountMin: z.number().nullable().optional(),
  amountMax: z.number().nullable().optional(),
  search: z.string().optional().default(''),
  sort: z.enum(['newest', 'oldest', 'amount_high', 'amount_low']).optional().default('newest'),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
});

export type GetAdminBatchesInput = z.infer<typeof getAdminBatchesInputSchema>;

// ── Zod output schema ─────────────────────────────────────────────────────────

export const getAdminBatchesOutputSchema = paginatedOutputSchema(z.array(adminBatchSchema));

export type GetAdminBatchesOutput = z.infer<typeof getAdminBatchesOutputSchema>;
