// ─────────────────────────────────────────────────────────────────────────────
// Admin — Action schemas para operaciones de admin (no relacionados a listados)
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

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
