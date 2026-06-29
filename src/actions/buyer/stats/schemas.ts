// ─────────────────────────────────────────────────────────────────────────────
// Buyer / Stats — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const buyerStatsOutputSchema = z.object({
  availableCards: z.number(),
  availableAmount: z.number(),
  orderBook: z.object({
    totalOrdersToday: z.number(),
    totalTradedToday: z.number(),
    entries: z.array(
      z.object({
        orderId: z.string(),
        buyerEmail: z.string(),
        cardCount: z.number(),
        total: z.number(),
        status: z.string(),
        createdAt: z.string(),
      }),
    ),
  }),
});