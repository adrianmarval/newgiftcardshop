// ─────────────────────────────────────────────────────────────────────────────
// Admin / Binance — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const getBinanceBalancesOutputSchema = z.object({
  spot: z.string(),
  funding: z.string(),
  total: z.string(),
});

export const withdrawBalanceInputSchema = z.object({ amount: z.number() });

export const withdrawBalanceOutputSchema = z.object({
  id: z.string().optional(),
  status: z.string().optional(),
});

export const syncWithdrawalsOutputSchema = z.object({
  total: z.number(),
  resolved: z.number(),
  failed: z.number(),
  stillPending: z.number(),
  errors: z.array(z.string()),
});