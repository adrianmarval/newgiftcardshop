// ─────────────────────────────────────────────────────────────────────────────
// Seller Schemas — Input/Output Zod schemas for seller actions
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { sellerBatchSchema } from './batch';

// ── Publish Batch ─────────────────────────────────────────────────────────────

/** Input schema for publishBatch action */
export const publishBatchSchema = z.object({
  cards: z.array(
    z.object({
      amount: z.string(),
      claimCode: z.string(),
      pinCode: z.string().optional(),
      /** Compressed JPEG as base64 — gets encrypted + stored as ProvenanceImage in transaction */
      compressedImageData: z.string().optional(),
    }),
  ),
  brandId: z.string(),
  countryId: z.string(),
});

export type PublishBatchInput = z.infer<typeof publishBatchSchema>;

/** Output schema for publishBatch action */
export const publishBatchOutputSchema = z.union([
  z.object({
    success: z.literal(true),
    batchId: z.string(),
    duplicates: z.array(z.string()),
  }),
  z.object({ error: z.string() }),
]);

// ── Get Seller Batches ─────────────────────────────────────────────────────────

/** Output schema for getSellerBatches action (references sellerBatchSchema from batch.ts) */
export const getSellerBatchesOutputSchema = z.object({
  success: z.literal(true),
  batches: z.array(sellerBatchSchema),
});

// ── Get Seller Rate ───────────────────────────────────────────────────────────

/** Output schema for getSellerRate action */
export const getSellerRateOutputSchema = z.object({
  success: z.literal(true),
  rate: z.number(),
});

// ── Check Existing Codes ─────────────────────────────────────────────────────────

/** Input schema for checkExistingCodes action */
export const checkExistingCodesSchema = z.object({
  codes: z.array(z.string()),
  brandId: z.string(),
  countryId: z.string(),
});

export type CheckExistingCodesInput = z.infer<typeof checkExistingCodesSchema>;

/** Output schema for checkExistingCodes action */
export const checkExistingCodesOutputSchema = z.object({
  success: z.literal(true),
  existingCodes: z.array(z.string()),
});
