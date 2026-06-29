// ─────────────────────────────────────────────────────────────────────────────
// Buyer / Preferences — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const updateSearchPreferencesInputSchema = z.object({
  minAmount: z.number().nullable(),
  maxAmount: z.number().nullable(),
});

export const updateSearchPreferencesOutputSchema = z.object({ success: z.literal(true) });

export const getSearchPreferencesOutputSchema = z.object({
  success: z.literal(true),
  minAmount: z.number().nullable(),
  maxAmount: z.number().nullable(),
  allowSearchPreferences: z.boolean(),
  allowBuyRateAdjustment: z.boolean(),
  buyRate: z.number().nullable(),
});

export const updateBuyRateInputSchema = z.object({
  brandCountryId: z.string().min(1, 'Debe seleccionar una marca y país'),
  buyRate: z
    .number()
    .min(0.8, 'La tarifa no puede ser inferior a 0.80 (80%)')
    .max(1.0, 'La tarifa no puede ser superior a 1.00 (100%)'),
});

export const updateBuyRateOutputSchema = z.object({ success: z.literal(true) });