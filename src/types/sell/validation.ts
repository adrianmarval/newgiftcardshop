// types/sell/validation.ts
// Zod schemas for gift card provenance validation

import { z } from 'zod';

// ─── Validation State ─────────────────────────────────────────────────────────
// Nuevo flujo simplificado: OCR silencioso + preguntar solo en monto mismatch

export const validationStateEnum = z.enum([
  'verified',
  'amount_mismatch',
  'amount_required',
  'no_capture',
  'code_new_detected',
  'capture_mismatch',
  'processing_error',
  'fuzzy_match',
  'skipped',
  'amount_not_found',
  'error',
]);

/**
 * Estados que bloquean publicación.
 * Solo amount_mismatch bloquea.
 */
export const BLOCKING_EVIDENCE_STATES = ['amount_mismatch', 'amount_required'] as const satisfies ReadonlyArray<
  z.infer<typeof validationStateEnum>
>;

export type BlockingEvidenceState = (typeof BLOCKING_EVIDENCE_STATES)[number];

/**
 * Returns true si el estado bloquea publicación.
 */
export function isBlockingEvidenceState(state: z.infer<typeof validationStateEnum> | undefined): boolean {
  if (!state) return false;
  return (BLOCKING_EVIDENCE_STATES as ReadonlyArray<string>).includes(state);
}

export type ValidationState = z.infer<typeof validationStateEnum>;

// ─── OCR Ingest Draft ─────────────────────────────────────────────────────────

/**
 * A single card row produced by OCR extraction from an uploaded image.
 * ocrConfidence determines initial evidence status:
 *   'high'   → verified (exact match)
 *   'fuzzy'  → fuzzy_match (requires seller confirmation)
 *   'manual' → no_capture (extraction failed; seller must fill in manually)
 */
export interface OCRDraftCard {
  /** Extracted claim code — may be undefined when extraction failed */
  claimCode?: string;
  /** Extracted amount — may be undefined */
  amount?: string;
  /** Source image ID */
  imageId?: string;
  /** Confidence level from OCR/matching pipeline */
  ocrConfidence: 'high' | 'fuzzy' | 'manual';
  /** Extracted claim code before normalization (for fuzzy display) */
  rawExtractedCode?: string;
  /** Extracted amount before normalization (for display) */
  rawExtractedAmount?: string;
}

/**
 * Output contract for the extractDraftBatch server action.
 */
export interface OCRIngestOutput {
  success: true;
  cards: OCRDraftCard[];
  /** Images where no code was found or extraction failed */
  ignoredImages: Array<{ imageId: string; reason: 'unreadable' | 'unmatched' }>;
}

// ─── Validation Result ────────────────────────────────────────────────────────

export const validationResultSchema = z.object({
  cardId: z.string(),
  state: validationStateEnum,
  extractedCode: z.string().optional(),
  extractedAmount: z.string().optional(),
  suggestedAmount: z.string().optional(),
  matchedImageId: z.string().optional(),
});

export type ValidationResult = z.infer<typeof validationResultSchema>;

// ─── Image Extraction Result ──────────────────────────────────────────────────
// For images that don't match any card (code_new_detected)

export const imageExtractionResultSchema = z.object({
  imageId: z.string(),
  extractedCode: z.string().optional(),
  extractedAmount: z.string().optional(),
});

export type ImageExtractionResult = z.infer<typeof imageExtractionResultSchema>;

// ─── Action I/O Schemas ──────────────────────────────────────────────────────

export const uploadProvenanceImageInputSchema = z.object({
  file: z.instanceof(File),
});

/**
 * Validate images against cards (manual-path matching).
 * Images are sent as compressed base64 (NOT encrypted — encryption only
 * happens at publishBatch time when persisting to DB).
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
      /** Compressed JPEG as base64 — sent directly to AI vision */
      compressedData: z.string(),
    }),
  ),
});

export const validateGiftCardImagesOutputSchema = z.union([
  z.object({
    success: z.literal(true),
    results: z.array(validationResultSchema),
    /** Extraction results for images that didn't match any card */
    unmatchedImages: z.array(imageExtractionResultSchema),
  }),
  z.object({ error: z.string() }),
]);

/**
 * OCR ingestion input — images only; no existing card list required.
 */
export const extractDraftBatchInputSchema = z.object({
  images: z.array(
    z.object({
      id: z.string(),
      compressedData: z.string(),
    }),
  ),
});

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
