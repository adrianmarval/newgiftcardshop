// ─────────────────────────────────────────────────────────────────────────────
// Seller Types — SellerBatch type (moved from seller-actions.ts)
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { giftcardSchema } from '@/types/giftcard/giftcard';
import { paymentSchema } from '@/types/order/payments';

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
  giftcards: z.array(giftcardSchema),
  payments: z.array(paymentSchema),
  effectiveTotal: z.number(),
  estimatedPayout: z.number(),
});

export type SellerBatch = z.infer<typeof sellerBatchSchema>;
