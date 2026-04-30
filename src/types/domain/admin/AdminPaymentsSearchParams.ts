// ─────────────────────────────────────────────────────────────────────────────
// Admin Payments — Search params y schemas (nuqs v2 + Zod)
// Parsers y schemas para filtrado de pagos en el admin dashboard.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';
import { paginatedOutputSchema } from '@/types/application/shared/Pagination';
import { adminPaymentSchema } from './AdminPayment';

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

export type AdminPaymentsSearchParamsKeys = keyof typeof adminPaymentsSearchParamsParsers;

export const getAdminPaymentsInputSchema = z.object({
  direction: z.enum(['ALL', 'CREDIT', 'DEBIT']).optional().default('ALL'),
  category: z.enum(['ALL', 'ORDER', 'BATCH', 'DEPOSIT', 'REFUND_BUYER', 'REFUND_SELLER']).optional().default('ALL'),
  userId: z.string().nullable().optional(),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  search: z.string().optional().default(''),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
});

export type GetAdminPaymentsInput = z.infer<typeof getAdminPaymentsInputSchema>;

export const getAdminPaymentsOutputSchema = paginatedOutputSchema(z.array(adminPaymentSchema));

export type GetAdminPaymentsOutput = z.infer<typeof getAdminPaymentsOutputSchema>;
