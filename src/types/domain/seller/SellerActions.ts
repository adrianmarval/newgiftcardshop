// ─────────────────────────────────────────────────────────────────────────────
// Seller — Action schemas para server actions
// Schemas de entrada/salida para publishBatch, checkExistingCodes, etc.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { paginatedOutputSchema } from '@/types/application/shared/Pagination';
import { sellerBatchSchema } from './SellerBatch';

// ── Publish Batch ───────────────────────────────────────────────────────────────

/**
 * Schema de entrada para publishBatch.
 * El seller publica un batch de cards con screenshots opcionales para OCR.
 */
export const publishBatchSchema = z.object({
  cards: z.array(
    z.object({
      /** Monto nominal del card. */
      amount: z.string(),
      /** Código de reclamo. */
      claimCode: z.string(),
      /** PIN opcional (para ciertos brands). */
      pinCode: z.string().optional(),
      /** Imagen comprimida como base64 (para OCR). Opcional. */
      compressedImageData: z.string().optional(),
    }),
  ),
  brandId: z.string(),
  countryId: z.string(),
});

export type PublishBatchInput = z.infer<typeof publishBatchSchema>;

/** Schema de salida para publishBatch */
export const publishBatchOutputSchema = z.union([
  z.object({
    success: z.literal(true),
    batchId: z.string(),
    /** Códigos que ya existían en la base de datos (fueron ignorados). */
    duplicates: z.array(z.string()),
  }),
  z.object({ error: z.string() }),
]);

// ── Get Seller Rate ─────────────────────────────────────────────────────────────

/** Schema de salida para getSellerRate */
export const getSellerRateOutputSchema = z.object({
  success: z.literal(true),
  rate: z.number(),
});

// ── Check Existing Codes ───────────────────────────────────────────────────────

/**
 * Schema de entrada para checkExistingCodes.
 * Verifica si ciertos códigos ya existen en la base de datos.
 * Se usa antes de publicar para evitar duplicados.
 */
export const checkExistingCodesSchema = z.object({
  codes: z.array(z.string()),
  brandId: z.string(),
  countryId: z.string(),
});

export type CheckExistingCodesInput = z.infer<typeof checkExistingCodesSchema>;

/** Schema de salida para checkExistingCodes */
export const checkExistingCodesOutputSchema = z.object({
  success: z.literal(true),
  existingCodes: z.array(z.string()),
});

// ── Get Seller Batches Output ──────────────────────────────────────────────────

/** Schema de salida para getSellerBatches (usa paginatedOutputSchema). */
export const getSellerBatchesOutputSchema = paginatedOutputSchema(z.array(sellerBatchSchema));
