// ─────────────────────────────────────────────────────────────────────────────
// Admin — Filters for admin batches list
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const adminBatchesFiltersSchema = z.object({
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

export type AdminBatchesFilters = z.infer<typeof adminBatchesFiltersSchema>;

export const payBatchesInputSchema = z.object({
  batchIds: z.array(z.number().int().positive()),
});

export type PayBatchesInput = z.infer<typeof payBatchesInputSchema>;

export const payBatchesOutputSchema = z.object({
  success: z.literal(true),
  results: z.array(
    z.object({
      batchId: z.number(),
      paymentId: z.string(),
      amount: z.number(),
    }),
  ),
});

export const deleteBatchInputSchema = z.object({
  batchId: z.number().int().positive(),
});

export const deleteBatchOutputSchema = z.union([z.object({ success: z.literal(true) }), z.object({ error: z.string() })]);

export const deleteCardInputSchema = z.object({
  cardId: z.string(),
});

export const deleteCardOutputSchema = z.union([z.object({ success: z.literal(true) }), z.object({ error: z.string() })]);

export interface AdminBatchesFiltersProps {
  sellers: Array<{ id: string; name: string }>;
}
