// ─────────────────────────────────────────────────────────────────────────────
// Admin / Binance — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const getBinanceBalancesOutputSchema = z.object({
  spot: z.string(),
  funding: z.string(),
  total: z.string(),
});

export const withdrawBalanceInputSchema = z.object({
  amount: z.number().positive('El monto debe ser mayor a 0.').min(1, 'El retiro mínimo es 1 USDT.'),
  notes: z.string().max(255).optional(),
});

export const withdrawBalanceOutputSchema = z.object({
  paymentId: z.string(),
  amount: z.number(),
  status: z.enum(['PENDING', 'FAILED']),
  error: z.string().optional(),
});

export const getWithdrawInfoOutputSchema = z.object({
  configured: z.boolean(),
  walletMasked: z.string().optional(),
  coin: z.string().optional(),
  network: z.string().optional(),
});

export const syncWithdrawalsOutputSchema = z.object({
  total: z.number(),
  resolved: z.number(),
  failed: z.number(),
  stillPending: z.number(),
  errors: z.array(z.string()),
});
