// ─────────────────────────────────────────────────────────────────────────────
// Seller — Recent batches para dashboard preview
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

const giftcardPreviewSchema = z.object({
  id: z.string(),
  amount: z.number(),
  brand: z.object({
    name: z.string(),
    icon: z.string(),
    image: z.string().nullable(),
  }),
});

export const recentBatchSchema = z.object({
  id: z.number(),
  sellRate: z.number(),
  isPaid: z.boolean(),
  createdAt: z.string(),
  giftcards: z.array(giftcardPreviewSchema),
  cardsCount: z.number(),
  effectiveTotal: z.number(),
});

export type RecentBatch = z.infer<typeof recentBatchSchema>;
