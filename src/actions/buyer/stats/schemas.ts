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
  personal: z.object({
    creditLimit: z.number(),
    unpaidTotal: z.number(),
    availableCredit: z.number(),
    pendingOrdersCount: z.number(),
    totalSaved: z.number(),
    monthSpend: z.number(),
    monthOrdersCount: z.number(),
    reportedIssues: z.number(),
  }),
});