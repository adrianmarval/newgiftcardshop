// ─────────────────────────────────────────────────────────────────────────────
// Admin Orders — Search params y schemas (nuqs v2 + Zod)
// Parsers y schemas para filtrado de órdenes en el admin dashboard.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';
import { paginatedOutputSchema } from '@/types/application/shared/Pagination';
import { adminOrderSchema } from './AdminOrder';

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

export type AdminOrdersSearchParamsKeys = keyof typeof adminOrdersSearchParamsParsers;

export const getAdminOrdersInputSchema = z.object({
  buyerId: z.string().nullable().optional(),
  status: z.enum(['ALL', 'PENDING', 'AWAITING_PAYMENT', 'COMPLETED', 'CANCELLED']).optional().default('ALL'),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  search: z.string().optional().default(''),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
});

export type GetAdminOrdersInput = z.infer<typeof getAdminOrdersInputSchema>;

export const getAdminOrdersOutputSchema = paginatedOutputSchema(z.array(adminOrderSchema));

export type GetAdminOrdersOutput = z.infer<typeof getAdminOrdersOutputSchema>;
