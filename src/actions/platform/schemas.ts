// ─────────────────────────────────────────────────────────────────────────────
// Platform — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/client';

export const updatePlatformBalanceInputSchema = z.object({
  amount: z.instanceof(Decimal),
  type: z.enum(['add', 'subtract']),
});

export const updatePlatformBalanceOutputSchema = z.object({ success: z.literal(true) });

export const getPlatformSettingOutputSchema = z.object({
  success: z.literal(true),
  /** Valores parseados y tipados por setting key (balance incluido como número) */
  values: z.record(z.string(), z.unknown()),
});

export const updateSettingsGroupInputSchema = z.object({
  group: z.string().trim().min(1),
  values: z.record(z.string(), z.unknown()),
});

export const updateSettingsGroupOutputSchema = z.object({
  success: z.literal(true),
  updated: z.number(),
});

export const getPlatformBalanceOutputSchema = z.object({ success: z.literal(true), balance: z.number() });

export const getBinancePayPaymentIdOutputSchema = z.object({
  success: z.literal(true),
  binancePayId: z.string(),
});
