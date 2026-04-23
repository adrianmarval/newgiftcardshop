// ─────────────────────────────────────────────────────────────────────────────
// Order — Buyer stats para dashboard
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const buyerStatsSchema = z.object({
  /** Cards disponibles para compra en la plataforma. */
  availableCards: z.number(),
  /** Total de órdenes del buyer. */
  myOrders: z.number(),
  /** Órdenes en progreso (PENDING o AWAITING_PAYMENT). */
  activeOrders: z.number(),
  /** Ahorro total en compras completadas (faceValue - effective). */
  totalSaved: z.number(),
});

export type BuyerStats = z.infer<typeof buyerStatsSchema>;
