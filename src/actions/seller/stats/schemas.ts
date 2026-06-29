// ─────────────────────────────────────────────────────────────────────────────
// Seller / Stats — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const sellerStatsOutputSchema = z.object({
  totalCards: z.number(),
  totalBatches: z.number(),
  paidBatches: z.number(),
  unpaidBatches: z.number(),
});