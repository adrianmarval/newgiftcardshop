// ─────────────────────────────────────────────────────────────────────────────
// Sell Flow — Gift card en el wizard de venta
// Estado efímero de una gift card dentro del sell flow wizard.
// NO confundir con domain/giftcard/Giftcard que es la entidad persistida.
//
// La diferencia clave:
// - SellFlowCard: existe SOLO durante el wizard, tiene amount como string (form input)
// - Giftcard: entidad persistida, amount es number
// ─────────────────────────────────────────────────────────────────────────────

import type { ValidationState } from './evidence';

// ── Evidence sub-state per card ───────────────────────────────────────────────

/**
 * Tracking de evidencia por card.
 * Contiene todo el metadata de screenshot/OCR para que los guards de publicación
 * y la UI de review puedan leer estado determinístico del store (no estado ephemeral de componentes).
 *
 * Flujo de evidence:
 * 1. Seller sube screenshot → status: no_capture inicialmente
 * 2. OCR extrae código/monto → si match: verified
 * 3. Si monto extraído ≠ monto declarado → amount_mismatch (BLOQUEA)
 * 4. Seller decide: accept-extracted o keep-declared
 */
export interface SellFlowCardEvidence {
  /** Estado de validación: verified, amount_mismatch, no_capture, etc. */
  status: ValidationState;
  /** ID de imagen vinculada (si aplica). */
  matchedImageId?: string;
  /** Código extraído de la imagen. */
  extractedCode?: string;
  /** Monto extraído de la imagen. */
  extractedAmount?: string;
  /** Decisión del seller en amount_mismatch: accept-extracted o keep-declared. */
  amountDecision?: 'accept-extracted' | 'keep-declared';
}

// ── Unmatched image record ────────────────────────────────────────────────────

/**
 * Imagen que OCR/matching no pudo asociar a ningún card del batch.
 * Se almacena solo para display en review — nunca bloquea publicación.
 */
export interface SellFlowUnmatchedImage {
  imageId: string;
}

// ── Sell Flow item types ───────────────────────────────────────────────────────

/**
 * Gift card siendo ingresado por el seller en el wizard de venta.
 * Todos los campos son strings porque vienen directo de inputs de formulario
 * antes de cualquier parsing o validación.
 *
 * NOTA: Este tipo es EFEMERO - solo existe durante el wizard. Para la entidad
 * persistida usar domain/giftcard/Giftcard.
 *
 * IMPORTANTE: Se unificó a SOLO nested evidence. Los campos legacy flat
 * (validationState, matchedImageId, extractedCode, extractedAmount) fueron
 * eliminados. Acceder a través de evidence.* únicamente.
 */
export interface SellFlowCard {
  id: string;
  amount: string;
  claimCode: string;
  pinCode?: string;
  /** Fuente de ingreso: manual, bulk, o ocr */
  source?: 'manual' | 'bulk' | 'ocr';
  evidence: SellFlowCardEvidence;
}

// ── OCR Ingest Draft ──────────────────────────────────────────────────────────

/**
 * Card parseado desde screenshot via OCR.
 * Resultado de la extracción de una imagen.
 *
 * ocrConfidence determina el estado inicial:
 * - 'high' → código y monto exactos, verified
 * - 'manual' → extracción falló, seller debe completar manualmente
 */
export interface OCRDraftCard {
  /** Código extraído (undefined si extracción falló). */
  claimCode?: string;
  /** Monto extraído (undefined si no se encontró). */
  amount?: string;
  /** ID de la imagen source. */
  imageId?: string;
  /** Nivel de confianza del OCR. */
  ocrConfidence: 'high' | 'manual';
  /** Código antes de normalization. */
  rawExtractedCode?: string;
  /** Monto antes de normalization (para mostrar al seller). */
  rawExtractedAmount?: string;
}

/**
 * Output del action extractDraftBatch.
 */
export interface OCRIngestOutput {
  success: true;
  cards: OCRDraftCard[];
  /** Imágenes donde no se encontró código o falló extracción. */
  ignoredImages: Array<{ imageId: string; reason: 'unreadable' | 'unmatched' }>;
}
