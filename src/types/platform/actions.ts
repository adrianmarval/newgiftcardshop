// ─────────────────────────────────────────────────────────────────────────────
// Platform Types — Platform settings schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

/**
 * CRITICAL FIX: description must be nullable + optional
 * (the DB column allows NULL and the field is optional in input)
 */
export const platformSettingSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
  description: z.string().nullable().optional(),
});

export type PlatformSetting = z.infer<typeof platformSettingSchema>;

// ── Platform Actions ───────────────────────────────────────────────────────────

/** Output schema for getPlatformSetting action */
export const getPlatformSettingOutputSchema = z.object({
  success: z.literal(true),
  settings: z.array(platformSettingSchema),
});

/** Input schema for setPlatformSetting action */
export const setPlatformSettingInputSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().optional(),
});

export type SetPlatformSettingInput = z.infer<typeof setPlatformSettingInputSchema>;

/** Output schema for setPlatformSetting action */
export const setPlatformSettingOutputSchema = z.object({
  success: z.literal(true),
});
