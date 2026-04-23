// ─────────────────────────────────────────────────────────────────────────────
// Catalog — Country entity
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

/**
 * Representa un país donde opera la plataforma.
 * Cada país puede tener sus propias marcas disponibles y moneda local.
 *
 * Ejemplo:
 * ```json
 * {
 *   "id": "country_ar",
 *   "name": "Argentina",
 *   "code": "AR",
 *   "currency": "ARS"
 * }
 * ```
 */
export const countrySchema = z.object({
  /** ID único del país. */
  id: z.string(),
  /** Nombre completo del país. */
  name: z.string(),
  /** Código ISO de 2 letras (ej: AR, US, MX). */
  code: z.string(),
  /** Código de moneda ISO (ej: ARS, USD). Nullable si no aplica. */
  currency: z.string().nullable().optional(),
});

/** Tipo TypeScript para un Country del catálogo. */
export type Country = z.infer<typeof countrySchema>;

// ── Schemas de Acciones — Países ──────────────────────────────────────────────

/** Schema de entrada para getCountryById */
export const getCountryByIdInputSchema = z.object({ id: z.string() });
export type GetCountryByIdInput = z.infer<typeof getCountryByIdInputSchema>;

/** Schema de salida para getActiveCountries */
export const getActiveCountriesOutputSchema = z.object({
  success: z.literal(true),
  countries: z.array(countrySchema),
});

/** Schema de salida para getCountryById */
export const getCountryByIdOutputSchema = z.union([
  z.object({ success: z.literal(true), country: countrySchema.nullable() }),
  z.object({ error: z.string() }),
]);
