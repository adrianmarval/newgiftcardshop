// ─────────────────────────────────────────────────────────────────────────────
// Platform — Settings del plataforma
// Zod schemas para settings de configuración del platform.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

/**
 * Setting individual del platform (key-value store).
 * El admin puede crear/editar settings desde el dashboard admin.
 *
 * Ejemplo:
 * { id: "setting_1", key: "MIN_BUY_AMOUNT", value: "10", description: "Monto mínimo de compra en USD" }
 */
export const platformSettingSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
  /** Descripción del setting. Nullable porque la columna DB permite NULL. */
  description: z.string().nullable().optional(),
  balance: z.number().optional(),
});

export type PlatformSetting = z.infer<typeof platformSettingSchema>;

// ── Platform Actions ───────────────────────────────────────────────────────────

/** Schema de salida para getPlatformSetting */
export const getPlatformSettingOutputSchema = z.object({
  success: z.literal(true),
  settings: z.array(platformSettingSchema),
});

/** Schema de entrada para setPlatformSetting */
export const setPlatformSettingInputSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().optional(),
  balance: z.number().optional(),
});

export type SetPlatformSettingInput = z.infer<typeof setPlatformSettingInputSchema>;

/** Schema de salida para setPlatformSetting */
export const setPlatformSettingOutputSchema = z.object({
  success: z.literal(true),
});

/** Schema de entrada para deletePlatformSetting */
export const deletePlatformSettingInputSchema = z.object({
  key: z.string(),
});

/** Schema de salida para deletePlatformSetting */
export const deletePlatformSettingOutputSchema = z.object({
  success: z.literal(true),
});
