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
  /** Current evidence status — drives blocking logic */
  status: ValidationState;
  /** ID of the uploaded SellFlowImage matched to this card */
  matchedImageId?: string;
  /** Claim code as extracted from the matched image */
  extractedCode?: string;
  /** Amount extracted from the matched image */
  extractedAmount?: string;
  /** True when the seller explicitly confirmed a fuzzy match */
  fuzzyConfirmed?: boolean;
  /** Seller decision for amount mismatch */
  amountDecision?: 'accept-extracted' | 'keep-declared';
}

// ── Unmatched image record ────────────────────────────────────────────────────

/**
 * Image that OCR/matching could not associate with any card in the batch.
 * Stored for review display only — never blocks publishing.
 */
export interface SellFlowUnmatchedImage {
  imageId: string;
  extractedCode?: string;
  extractedAmount?: string;
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

  /** How this card row entered the batch */
  source: 'manual' | 'bulk' | 'ocr';

  /**
   * Per-card evidence state. Always present; defaults to { status: 'no_capture' }.
   * replaces the old flat validationState / extractedCode / extractedAmount / matchedImageId fields.
   */
  evidence: SellFlowCardEvidence;

  // ── Legacy flat fields — kept for backward-compat during transition ──────
  // Components that haven't been migrated yet may read these.
  // They shadow evidence.* and will be removed after UI cutover.
  /** @deprecated Use evidence.status */
  validationState?: ValidationState;
  /** @deprecated Use evidence.extractedCode */
  extractedCode?: string;
  /** @deprecated Use evidence.extractedAmount */
  extractedAmount?: string;
  /** @deprecated Use evidence.matchedImageId */
  matchedImageId?: string;
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

// ── Removed-card snapshot (single-step undo) ─────────────────────────────────

export interface RemovedCardSnapshot {
  card: SellFlowGiftcard;
  index: number;
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
  /** Uploaded images — used for OCR ingestion and evidence previews */
  images: SellFlowImage[];
  /** Screenshots that did not match any card — informational only, never blocks */
  unmatchedImages: SellFlowUnmatchedImage[];
  /** Last removed card — single-step undo support */
  lastRemovedCard: RemovedCardSnapshot | null;

  // ── Navigation ────────────────────────────────────────────────────────────
  setStep: (step: number) => void;

  // ── Brand / Country ──────────────────────────────────────────────────────
  setSelectedBrand: (brand: string) => void;
  setSelectedCountry: (country: string) => void;

  // ── Card management ──────────────────────────────────────────────────────
  setGiftcards: (giftcards: SellFlowGiftcard[]) => void;
  addGiftcard: () => void;
  removeGiftcard: (id: string) => void;
  undoRemoveCard: () => void;
  updateGiftcard: (id: string, field: keyof Pick<SellFlowGiftcard, 'amount' | 'claimCode' | 'pinCode'>, value: string) => void;
  handleBulkImport: (cards: { amount?: string; claimCode: string }[]) => { importedCount: number; duplicateCount: number };

  // ── OCR ingestion ────────────────────────────────────────────────────────
  /**
   * Merge a batch of OCR-extracted draft cards into the store.
   * Deduplicates by claimCode (normalized). Empty-code rows are always added.
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

  // ── Correction actions ────────────────────────────────────────────────────
  /**
   * Accept the amount extracted from the screenshot instead of the declared amount.
   * Clears the amount_mismatch block.
   */
  acceptExtractedAmount: (cardId: string) => void;
  /**
   * Keep the amount declared by the seller — dismiss the extracted amount mismatch.
   * Clears the amount_mismatch block.
   */
  keepDeclaredAmount: (cardId: string) => void;
  /**
   * Confirm a fuzzy claim-code match — marks evidence.status as 'verified' and sets fuzzyConfirmed.
   * Clears the fuzzy_match block.
   */
  confirmFuzzyMatch: (cardId: string) => void;
  /**
   * Reject a fuzzy claim-code suggestion and keep both codes as separate cards.
   * Restores the typed card to no_capture and creates a new OCR card from the screenshot.
   */
  rejectFuzzyMatch: (cardId: string) => void;
  /**
   * Resolve amount mismatch with an explicit choice.
   * Convenience wrapper over acceptExtractedAmount / keepDeclaredAmount / removeGiftcard.
   */
  resolveAmountMismatch: (cardId: string, choice: 'accept-extracted' | 'keep-declared' | 'remove') => void;

  // ── Image management ─────────────────────────────────────────────────────
  addImage: (image: SellFlowImage) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;
  setUnmatchedImages: (images: SellFlowUnmatchedImage[]) => void;
  /** Agregar imagen a tarjeta específica con validación OCR */
  addImageToCard: (
    cardId: string,
    imageData: { imageId: string; compressedData: string; previewUrl: string },
    extractedClaimCode: string | null,
    extractedAmount: string | null,
  ) => void;

  // ── OCR resolution in intake ──────────────────────────────────────────────
  setCardValidationResult: (
    id: string,
    state: ValidationState,
    extractedCode?: string,
    extractedAmount?: string,
    matchedImageId?: string,
  ) => void;
  /** Marks a single card as skipped for OCR evidence — non-blocking. */
  skipCardEvidence: (id: string) => void;

  // ── Reset ────────────────────────────────────────────────────────────────
  resetForm: () => void;
}
