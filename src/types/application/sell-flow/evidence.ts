// ─────────────────────────────────────────────────────────────────────────────
// Sell Flow — Evidence validation states (OCR)
// Estados posibles en el proceso de validación de evidencia por screenshots.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

// ─── Validation State ─────────────────────────────────────────────────────────

/**
 * Estados posibles en el proceso de validación de evidencia.
 *
 * Flujo OCR simplificado:
 * 1. Seller sube screenshots
 * 2. OCR extrae códigos silenciosamente
 * 3. Si monto extraído ≠ monto declarado → amount_mismatch (bloquea)
 * 4. Seller confirma/rechaza el mismatch
 * 5. Si todo OK → verified
 */
export const validationStateEnum = z.enum([
  'verified', // Validación exitosa
  'amount_mismatch', // Monto extraído ≠ monto declarado (BLOQUEA publicación)
  'amount_required', // No se proveyó monto y es requerido (BLOQUEA)
  'no_capture', // No se capturó screenshot (opcional, no bloquea)
  'code_new_detected', // Código encontrado en imagen pero no coincide con ningún card
  'capture_mismatch', // Screenshot no coincide con el card
  'processing_error', // Error en procesamiento
  'fuzzy_match', // Código encontrado pero con match fuzzy ( requiere confirmación)
  'skipped', // Validación saltada por el seller
  'amount_not_found', // No se pudo extraer monto de la imagen
  'error', // Estado genérico de error
]);

/**
 * Estados que bloquean la publicación del batch.
 * Solo amount_mismatch bloquea actualmente (amount_required es por si se necesita).
 */
export const BLOCKING_EVIDENCE_STATES = ['amount_mismatch', 'amount_required'] as const satisfies ReadonlyArray<
  z.infer<typeof validationStateEnum>
>;

/** Tipo auxiliar para estados que bloquean. */
export type BlockingEvidenceState = (typeof BLOCKING_EVIDENCE_STATES)[number];

/**
 * Verifica si un estado bloquea la publicación.
 * @param state - Estado a verificar
 * @returns true si el estado bloquea publicación
 */
export function isBlockingEvidenceState(state: z.infer<typeof validationStateEnum> | undefined): boolean {
  if (!state) return false;
  return (BLOCKING_EVIDENCE_STATES as ReadonlyArray<string>).includes(state);
}

export type ValidationState = z.infer<typeof validationStateEnum>;

// ─── Action I/O Schemas ──────────────────────────────────────────────────────

/** Schema de entrada para uploadProvenanceImage */
export const uploadProvenanceImageInputSchema = z.object({
  file: z.instanceof(File),
});

/**
 * Schema de entrada para validateGiftCardImages.
 * Imágenes se envían como base64 comprimido (NO encriptado — la encriptación
 * ocurre recién en publishBatch al persistir en la DB).
 */
export const validateGiftCardImagesInputSchema = z.object({
  cards: z.array(
    z.object({
      id: z.string(),
      claimCode: z.string(),
      amount: z.string(),
    }),
  ),
  images: z.array(
    z.object({
      id: z.string(),
      compressedData: z.string(),
    }),
  ),
});

/** Schema de salida para validateGiftCardImages */
export const validateGiftCardImagesOutputSchema = z.union([
  z.object({
    success: z.literal(true),
    results: z.array(
      z.object({
        cardId: z.string(),
        state: validationStateEnum,
        extractedCode: z.string().optional(),
        extractedAmount: z.string().optional(),
        suggestedAmount: z.string().optional(),
        matchedImageId: z.string().optional(),
      }),
    ),
    unmatchedImages: z.array(
      z.object({
        imageId: z.string(),
        extractedCode: z.string().optional(),
        extractedAmount: z.string().optional(),
      }),
    ),
  }),
  z.object({ error: z.string() }),
]);

/**
 * Schema de entrada para extractDraftBatch.
 * OCR ingestion: solo imágenes, no requiere lista de cards existente.
 */
export const extractDraftBatchInputSchema = z.object({
  images: z.array(
    z.object({
      id: z.string(),
      compressedData: z.string(),
    }),
  ),
});

/** Schema de salida para extractDraftBatch */
export const extractDraftBatchOutputSchema = z.union([
  z.object({
    success: z.literal(true),
    cards: z.array(
      z.object({
        claimCode: z.string().optional(),
        amount: z.string().optional(),
        imageId: z.string().optional(),
        ocrConfidence: z.enum(['high', 'fuzzy', 'manual']),
        rawExtractedCode: z.string().optional(),
        rawExtractedAmount: z.string().optional(),
      }),
    ),
    ignoredImages: z.array(
      z.object({
        imageId: z.string(),
        reason: z.enum(['unreadable', 'unmatched']),
      }),
    ),
  }),
  z.object({ error: z.string() }),
]);
