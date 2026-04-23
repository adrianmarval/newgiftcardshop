// ─────────────────────────────────────────────────────────────────────────────
// Catalog — Brand entity
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

/**
 * Representa una marca de gift card en el catálogo.
 *
 * Ejemplo:
 * ```json
 * {
 *   "id": "brand_amazon",
 *   "slug": "amazon",
 *   "name": "Amazon",
 *   "icon": "/icons/amazon.svg",
 *   "image": "/images/amazon-banner.jpg"
 * }
 * ```
 */
export const brandSchema = z.object({
  /** ID único de la marca. */
  id: z.string(),
  /** Slug URL-friendly para la marca. */
  slug: z.string(),
  /** Nombre completo de la marca (para mostrar en UI). */
  name: z.string(),
  /** URL del icono de la marca (uso en cards/badges). */
  icon: z.string(),
  /** URL de la imagen promotional (nullable si no hay banner). */
  image: z.string().nullable(),
});

/** Tipo TypeScript para una Brand del catálogo. */
export type Brand = z.infer<typeof brandSchema>;

// ── Schemas de Acciones — Marcas ───────────────────────────────────────────────

/** Schema de entrada para getBrandById */
export const getBrandByIdInputSchema = z.object({ id: z.string() });
export type GetBrandByIdInput = z.infer<typeof getBrandByIdInputSchema>;

/** Schema de salida para getActiveBrands */
export const getActiveBrandsOutputSchema = z.object({
  success: z.literal(true),
  brands: z.array(brandSchema),
});

/** Schema de salida para getBrandById */
export const getBrandByIdOutputSchema = z.union([
  z.object({ success: z.literal(true), brand: brandSchema.nullable() }),
  z.object({ error: z.string() }),
]);
