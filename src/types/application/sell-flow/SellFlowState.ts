// ─────────────────────────────────────────────────────────────────────────────
// Sell Flow — Estado del wizard de venta (Zustand store)
// Forma del store Zustand para el wizard de venta de 3 pasos.
// ─────────────────────────────────────────────────────────────────────────────

import type { SellFlowCard, SellFlowUnmatchedImage } from './SellFlowCard';
import type { SellFlowImage } from './SellFlowImage';

// ── Sell Flow State ───────────────────────────────────────────────────────────

/**
 * Forma del store Zustand para el wizard de venta.
 *
 * Secuencia de pasos FIJA:
 * 1. BrandStep → Selección de brand y país
 * 2. IntakeStep → Ingreso de códigos + resolución OCR
 * 3. ReviewStep → Verificación de evidencia, resolver mismatches, publicar
 */
export interface SellFlowState {
  step: number;
  selectedBrandCountry: string; // Composite: brandId|countryId
  brandCountryLimits: { minAmount: number | null; maxAmount: number | null };
  giftcards: SellFlowCard[];
  images: SellFlowImage[];
  unmatchedImages: SellFlowUnmatchedImage[];

  // ── Navigation ──────────────────────────────────────────────────────────────

  setStep: (step: number) => void;
  setSelectedBrandCountry: (brandCountry: string, limits: { minAmount: number | null; maxAmount: number | null }) => void;

  // ── Giftcard Management ─────────────────────────────────────────────────────

  setGiftcards: (giftcards: SellFlowCard[]) => void;
  removeGiftcard: (id: string) => void;
  updateGiftcard: (id: string, field: keyof Pick<SellFlowCard, 'amount' | 'claimCode' | 'pinCode'>, value: string) => void;

  /**
   * Import bulk desde paste de texto.
   * @returns { importedCount, duplicateCount } — cuenta de cards importados y duplicados intra-paste
   */
  handleBulkImport: (cards: { amount?: string; claimCode: string }[]) => { importedCount: number; duplicateCount: number };

  // ── OCR / Evidence ──────────────────────────────────────────────────────────

  /**
   * Ingesta cards extraídos de OCR draft.
   * Se llama después de extractDraftBatch.
   */
  ingestOCRDraft: (
    draftCards: Array<{
      claimCode?: string;
      amount?: string;
      imageId?: string;
      ocrConfidence: 'high' | 'fuzzy' | 'manual';
      rawExtractedCode?: string;
      rawExtractedAmount?: string;
    }>,
    ignoredImages?: Array<{ imageId: string; reason: 'unreadable' | 'unmatched' }>,
  ) => void;

  /** Seller acepta el monto extraído por OCR (para amount_mismatch). */
  acceptExtractedAmount: (cardId: string) => void;
  /** Seller mantiene el monto declarado originalmente (para amount_mismatch). */
  keepDeclaredAmount: (cardId: string) => void;
  /** Seller confirma match fuzzy (código similar pero no idéntico). */
  confirmFuzzyMatch: (cardId: string) => void;
  /** Seller rechaza match fuzzy. */
  rejectFuzzyMatch: (cardId: string) => void;
  /** Resuelve un amount_mismatch: accept-extracted, keep-declared, o remove card. */
  resolveAmountMismatch: (cardId: string, choice: 'accept-extracted' | 'keep-declared' | 'remove') => void;

  // ── Image Management ────────────────────────────────────────────────────────

  addImage: (image: SellFlowImage) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;
  setUnmatchedImages: (images: SellFlowUnmatchedImage[]) => void;

  /** Asocia una imagen a un card específico con datos de extracción. */
  addImageToCard: (
    cardId: string,
    imageData: { imageId: string; compressedData: string; previewUrl: string },
    extractedClaimCode: string | null,
    extractedAmount: string | null,
  ) => void;

  // ── Reset ───────────────────────────────────────────────────────────────────

  resetForm: () => void;
}
