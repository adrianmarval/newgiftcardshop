// ─────────────────────────────────────────────────────────────────────────────
// Flow Types — Sell flow state types
// These are consumed by Zustand stores (use-sell-flow) and the
// step components that participate in the sell multi-step wizard.
//
// Screenshot / evidence semantics:
//   Screenshots are OPTIONAL enrichment. Cards without capture publish fine.
//   Only amount_mismatch (screenshot-backed) and unconfirmed fuzzy_match block.
//   Unmatched screenshots never block publishing.
// ─────────────────────────────────────────────────────────────────────────────

import type { ValidationState } from '@/types/sell/validation';

// ── Evidence sub-state per card ───────────────────────────────────────────────

/**
 * Per-card evidence tracking.
 * Holds all screenshot/OCR metadata so publish guards and review UI
 * can read deterministic state from the store (not ephemeral component state).
 */
export interface SellFlowCardEvidence {
  /** Estado: verified, amount_mismatch, no_capture, image_only, error */
  status: ValidationState;
  /** ID de imagen vinculada (si aplica) */
  matchedImageId?: string;
  /** Código extraído de la imagen */
  extractedCode?: string;
  /** Monto extraído de la imagen */
  extractedAmount?: string;
  /** Decisión del usuario en amount_mismatch */
  amountDecision?: 'accept-extracted' | 'keep-declared';
}

// ── Unmatched image record ────────────────────────────────────────────────────

/**
 * Image that OCR/matching could not associate with any card in the batch.
 * Stored for review display only — never blocks publishing.
 */
export interface SellFlowUnmatchedImage {
  imageId: string;
}

// ── Sell Flow item types ───────────────────────────────────────────────────────

/**
 * Represents a single gift card being entered by a seller in the sell flow
 * wizard. All fields are strings because they come directly from form inputs
 * before any parsing or validation.
 */
export interface SellFlowGiftcard {
  id: string;
  amount: string;
  claimCode: string;
  pinCode?: string;
  evidence: SellFlowCardEvidence;
  validationState?: string;
  extractedCode?: string;
  extractedAmount?: string;
  matchedImageId?: string;
  source?: string;
}

/**
 * An uploaded image waiting for AI validation or OCR ingestion.
 * NOT encrypted — encryption only happens at publishBatch time.
 * Stores compressed JPEG as base64 for sending to AI vision,
 * and a local object URL for the thumbnail preview.
 */
export interface SellFlowImage {
  id: string;
  /** Compressed JPEG as base64 — sent directly to AI vision, encrypted only at publish */
  compressedData: string;
  /** Local object URL for thumbnail preview (URL.createObjectURL) */
  previewUrl: string;
}

// ── Sell Flow State ───────────────────────────────────────────────────────────

/**
 * Zustand store shape for the sell flow wizard.
 *
 * Fixed sequence: 1 (Brand) → 2 (Intake + OCR resolution) → 3 (Review)
 */
export interface SellFlowState {
  step: number;
  selectedBrand: string;
  selectedCountry: string;
  giftcards: SellFlowGiftcard[];
  images: SellFlowImage[];
  unmatchedImages: SellFlowUnmatchedImage[];

  setStep: (step: number) => void;
  setSelectedBrand: (brand: string) => void;
  setSelectedCountry: (country: string) => void;
  setGiftcards: (giftcards: SellFlowGiftcard[]) => void;
  removeGiftcard: (id: string) => void;
  updateGiftcard: (id: string, field: keyof Pick<SellFlowGiftcard, 'amount' | 'claimCode' | 'pinCode'>, value: string) => void;
  handleBulkImport: (cards: { amount?: string; claimCode: string }[]) => { importedCount: number; duplicateCount: number };
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
  acceptExtractedAmount: (cardId: string) => void;
  keepDeclaredAmount: (cardId: string) => void;
  confirmFuzzyMatch: (cardId: string) => void;
  rejectFuzzyMatch: (cardId: string) => void;
  resolveAmountMismatch: (cardId: string, choice: 'accept-extracted' | 'keep-declared' | 'remove') => void;
  addImage: (image: SellFlowImage) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;
  setUnmatchedImages: (images: SellFlowUnmatchedImage[]) => void;
  addImageToCard: (
    cardId: string,
    imageData: { imageId: string; compressedData: string; previewUrl: string },
    extractedClaimCode: string | null,
    extractedAmount: string | null,
  ) => void;
  resetForm: () => void;
}
