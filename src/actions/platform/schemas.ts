// ─────────────────────────────────────────────────────────────────────────────
// Platform — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/client';

export const platformSettingSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
  description: z.string().nullable().optional(),
  balance: z.number().optional(),
});

export type PlatformSetting = z.infer<typeof platformSettingSchema>;

export const updatePlatformBalanceInputSchema = z.object({
  amount: z.instanceof(Decimal),
  type: z.enum(['add', 'subtract']),
});

export const updatePlatformBalanceOutputSchema = z.object({ success: z.literal(true) });

export const setPlatformSettingInputSchema = z.object({
  key: z.string().trim().min(1),
  value: z.string().trim().min(1),
  description: z.string().trim().optional(),
});

export const setPlatformSettingOutputSchema = z.object({ success: z.literal(true) });

export const getPlatformSettingOutputSchema = z.object({
  success: z.literal(true),
  settings: platformSettingSchema.array(),
});

export const getPlatformBalanceOutputSchema = z.object({ success: z.literal(true), balance: z.number() });

export const getBinancePayPaymentIdOutputSchema = z.object({
  success: z.literal(true),
  binancePayId: z.string(),
});

export const deletePlatformSettingInputSchema = z.object({ key: z.string().trim().min(1) });

export const deletePlatformSettingOutputSchema = z.object({ success: z.literal(true) });