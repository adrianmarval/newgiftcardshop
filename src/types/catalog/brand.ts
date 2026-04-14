// ─────────────────────────────────────────────────────────────────────────────
// Catalog Types — Brand and Country entities
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";

// ── Brand ─────────────────────────────────────────────────────────────────────

export const brandSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  icon: z.string(),
  image: z.string().nullable(),
});

export type Brand = z.infer<typeof brandSchema>;

// ── Country ──────────────────────────────────────────────────────────────────

export const countrySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  currency: z.string().nullable().optional(),
});

export type Country = z.infer<typeof countrySchema>;
