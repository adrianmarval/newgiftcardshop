// ─────────────────────────────────────────────────────────────────────────────
// Seller Types — Input/Output schemas for seller actions
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";
import { sellerBatchSchema } from "./batch";

// ── Publish Batch ─────────────────────────────────────────────────────────────

/** Input schema for publishBatch action */
export const publishBatchSchema = z.object({
  cards: z.array(
    z.object({
      amount: z.string(),
      claimCode: z.string(),
      pinCode: z.string().optional(),
    }),
  ),
  brandId: z.string(),
  countryId: z.string(),
});

export type PublishBatchInput = z.infer<typeof publishBatchSchema>;

/** Output schema for publishBatch action */
export const publishBatchOutputSchema = z.union([
  z.object({ success: z.literal(true), batchId: z.string(), duplicates: z.array(z.string()) }),
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
export const getSellerRateOutputSchema = z.object({ success: z.literal(true), rate: z.number() });
