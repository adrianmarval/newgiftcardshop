// ─────────────────────────────────────────────────────────────────────────────
// Seller — Stats para dashboard
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const sellerStatsSchema = z.object({
  /** Total de tarjetas cargadas por el seller. */
  totalCards: z.number(),
  /** Total de batches creados por el seller. */
  totalBatches: z.number(),
  /** Batches cobrados por el admin. */
  paidBatches: z.number(),
  /** Batches pendientes de cobro. */
  unpaidBatches: z.number(),
});

export type SellerStats = z.infer<typeof sellerStatsSchema>;
