// ─────────────────────────────────────────────────────────────────────────────
// Admin — Action schemas para server actions
// Schemas de salida para adminGetSellers, etc.
// Input/output schemas van en SearchParams.ts (pattern unificado con seller/order)
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const adminGetSellersOutputSchema = z.object({
  success: z.literal(true),
  sellers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
  ),
});

export type AdminGetSellersOutput = z.infer<typeof adminGetSellersOutputSchema>;
