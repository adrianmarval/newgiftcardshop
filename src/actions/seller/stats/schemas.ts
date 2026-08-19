// ─────────────────────────────────────────────────────────────────────────────
// Seller / Stats — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const sellerStatsOutputSchema = z.object({
  pendingPayout: z.number(),
  totalEarned: z.number(),
  inStockValue: z.number(),
  problemCards: z.number(),
});