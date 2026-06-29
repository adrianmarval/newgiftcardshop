// ─────────────────────────────────────────────────────────────────────────────
// Seller / Rates — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const getSellerRateInputSchema = z.object({
  brandCountryId: z.string().optional(),
  brandId: z.string().optional(),
  countryId: z.string().optional(),
});

export const getSellerRateOutputSchema = z.union([
  z.object({ success: z.literal(true), rate: z.number() }),
  z.object({ success: z.literal(false), error: z.string() }),
]);