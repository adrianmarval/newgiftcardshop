// ─────────────────────────────────────────────────────────────────────────────
// Sell Flow — Barrel export
// ─────────────────────────────────────────────────────────────────────────────

export type { SellFlowCard, SellFlowCardEvidence, SellFlowUnmatchedImage, OCRDraftCard, OCRIngestOutput } from './SellFlowCard';

export type { SellFlowImage } from './SellFlowImage';
export type { SellFlowState } from './SellFlowState';

export { validationStateEnum, BLOCKING_EVIDENCE_STATES, isBlockingEvidenceState } from './evidence';
export type { ValidationState, BlockingEvidenceState } from './evidence';

export {
  uploadProvenanceImageInputSchema,
  validateGiftCardImagesInputSchema,
  validateGiftCardImagesOutputSchema,
  extractDraftBatchInputSchema,
  extractDraftBatchOutputSchema,
} from './evidence';

// ── Backwards compatibility aliases ──────────────────────────────────────────
// These were the old names in src/types/flows/sell-flow.ts
export type { SellFlowCard as SellFlowGiftcard } from './SellFlowCard';
