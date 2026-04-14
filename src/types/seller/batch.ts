// ─────────────────────────────────────────────────────────────────────────────
// Seller Types — SellerBatch type (moved from seller-actions.ts)
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const sellerBatchCardSchema = z.object({
  id: z.string(),
  claimCode: z.string(),
  pinCode: z.string().nullable(),
  amount: z.number(),
  status: z.string(),
  isConfirmed: z.boolean(),
  reportedAmount: z.number().nullable(),
  orderId: z.string().nullable(),
  brand: z.object({
    name: z.string(),
    icon: z.string(),
    image: z.string().nullable(),
  }),
  country: z.object({ name: z.string(), code: z.string() }).nullable(),
});

export type SellerBatchCard = z.infer<typeof sellerBatchCardSchema>;

export const sellerBatchPaymentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  balanceAfter: z.number(),
  status: z.string(),
  /** CRITICAL FIX: createdAt is serialized as ISO string, not Date */
  createdAt: z.string(),
});

export type SellerBatchPayment = z.infer<typeof sellerBatchPaymentSchema>;

/**
 * A seller's gift-card batch as returned from getSellerBatches().
 * Named "Batch" in the UI layer to distinguish it from the Prisma
 * model "GiftcardBatch".
 */
export const sellerBatchSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  sellRate: z.number(),
  isPaid: z.boolean(),
  /** CRITICAL FIX: createdAt is serialized as ISO string, not Date */
  createdAt: z.string(),
  /** updatedAt may be needed for future use */
  updatedAt: z.string().optional(),
  giftcards: z.array(sellerBatchCardSchema),
  payments: z.array(sellerBatchPaymentSchema),
  effectiveTotal: z.number(),
  estimatedPayout: z.number(),
});

export type SellerBatch = z.infer<typeof sellerBatchSchema>;
