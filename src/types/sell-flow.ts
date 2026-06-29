// ─────────────────────────────────────────────────────────────────────────────
// Sell Flow — Types (shared between lib/, hooks/, and components)
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

// ── Validation State ────────────────────────────────────────────────────────

export const validationStateEnum = z.enum([
  'verified',
  'amount_mismatch',
  'amount_required',
  'no_capture',
  'code_new_detected',
  'capture_mismatch',
  'processing_error',
  'skipped',
  'amount_not_found',
  'error',
]);

export type ValidationState = z.infer<typeof validationStateEnum>;

export const BLOCKING_EVIDENCE_STATES = ['amount_mismatch', 'amount_required'] as const satisfies ReadonlyArray<
  z.infer<typeof validationStateEnum>
>;

export type BlockingEvidenceState = (typeof BLOCKING_EVIDENCE_STATES)[number];

export function isBlockingEvidenceState(state: ValidationState | undefined): boolean {
  if (!state) return false;
  return (BLOCKING_EVIDENCE_STATES as ReadonlyArray<string>).includes(state);
}

// ── Card Evidence ───────────────────────────────────────────────────────────

export interface SellFlowCardEvidence {
  status: ValidationState;
  matchedImageId?: string;
  extractedCode?: string;
  extractedAmount?: string;
  amountDecision?: 'accept-extracted' | 'keep-declared';
}

// ── Card ────────────────────────────────────────────────────────────────────

export interface SellFlowCard {
  id: string;
  amount: string;
  claimCode: string;
  pinCode?: string;
  source?: 'manual' | 'bulk' | 'ocr';
  evidence: SellFlowCardEvidence;
}

// ── Images ──────────────────────────────────────────────────────────────────

export interface SellFlowUnmatchedImage {
  imageId: string;
}

export interface SellFlowImage {
  id: string;
  compressedData: string;
  previewUrl: string;
}

// ── Local Image (UI pre-upload state) ───────────────────────────────────────

export interface LocalImage {
  file: File;
  previewUrl: string;
}

// ── OCR ─────────────────────────────────────────────────────────────────────

export interface OCRDraftCard {
  claimCode?: string;
  amount?: string;
  imageId?: string;
  ocrConfidence: 'high' | 'manual';
  rawExtractedCode?: string;
  rawExtractedAmount?: string;
}

// ── Processing Stage ──────────────────────────────────────────────────────

export type ProcessingStage = 'idle' | 'parsing' | 'uploading' | 'extracting' | 'ingesting' | 'done';

export const STAGE_LABELS: Record<ProcessingStage, string> = {
  idle: '',
  parsing: 'Parsing codes from text…',
  uploading: 'Uploading screenshots…',
  extracting: 'Analyzing screenshots with AI…',
  ingesting: 'Importing cards…',
  done: 'Done!',
};

export const STAGE_PROGRESS: Record<ProcessingStage, number> = {
  idle: 0,
  parsing: 15,
  uploading: 35,
  extracting: 70,
  ingesting: 90,
  done: 100,
};