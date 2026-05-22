// ─────────────────────────────────────────────────────────────────────────────
// use-sell-flow — Zustand store
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import { create } from 'zustand';
import { z } from 'zod';
import { MAX_BATCH_SIZE } from '@/lib/constants';

// ── Validation States ─────────────────────────────────────────────────────────

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

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SellFlowCardEvidence {
  status: ValidationState;
  matchedImageId?: string;
  extractedCode?: string;
  extractedAmount?: string;
  amountDecision?: 'accept-extracted' | 'keep-declared';
}

export interface SellFlowCard {
  id: string;
  amount: string;
  claimCode: string;
  pinCode?: string;
  source?: 'manual' | 'bulk' | 'ocr';
  evidence: SellFlowCardEvidence;
}

export interface SellFlowUnmatchedImage {
  imageId: string;
}

export interface SellFlowImage {
  id: string;
  compressedData: string;
  previewUrl: string;
}

export interface OCRDraftCard {
  claimCode?: string;
  amount?: string;
  imageId?: string;
  ocrConfidence: 'high' | 'manual';
  rawExtractedCode?: string;
  rawExtractedAmount?: string;
}

export interface SellFlowState {
  step: number;
  selectedBrandCountry: string;
  brandCountryLimits: { minAmount: number | null; maxAmount: number | null };
  giftcards: SellFlowCard[];
  images: SellFlowImage[];
  unmatchedImages: SellFlowUnmatchedImage[];
  setStep: (step: number) => void;
  setSelectedBrandCountry: (brandCountry: string, limits: { minAmount: number | null; maxAmount: number | null }) => void;
  setGiftcards: (giftcards: SellFlowCard[]) => void;
  removeGiftcard: (id: string) => void;
  updateGiftcard: (id: string, field: keyof Pick<SellFlowCard, 'amount' | 'claimCode' | 'pinCode'>, value: string) => void;
  handleBulkImport: (cards: { amount?: string; claimCode: string }[]) => { importedCount: number; duplicateCount: number; error?: string };
  ingestOCRDraft: (draftCards: Array<OCRDraftCard>) => void;
  acceptExtractedAmount: (cardId: string) => void;
  keepDeclaredAmount: (cardId: string) => void;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasCardContent(card: SellFlowCard): boolean {
  return !!(card.amount || card.claimCode || card.pinCode);
}

function parseAmount(value?: string): number | null {
  if (!value) return null;
  const normalized = Number.parseFloat(value.replace(/[$,]/g, '').replace(/,/g, '.'));
  return Number.isFinite(normalized) ? normalized : null;
}

function formatAmount(value?: string): string {
  if (!value || !value.trim()) return '';
  const trimmed = value.trim();

  const parsed = parseAmount(trimmed);
  if (parsed === null) return trimmed;

  if (/^\d+$/.test(trimmed)) {
    return parsed.toFixed(2);
  }

  if (trimmed.includes('.')) {
    const [int, dec] = trimmed.split('.');
    const cleanInt = int.replace(/[$,]/g, '') || '0';
    const cleanDec = dec.slice(0, 2).padEnd(2, '0');
    return `${cleanInt}.${cleanDec}`;
  }

  if (trimmed.includes(',')) {
    const [int, dec] = trimmed.split(',');
    const cleanInt = int.replace(/[$,]/g, '') || '0';
    const cleanDec = dec.slice(0, 2).padEnd(2, '0');
    return `${cleanInt}.${cleanDec}`;
  }

  return parsed.toFixed(2);
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useSellFlow = create<SellFlowState>((set, get) => ({
  step: 1,
  selectedBrandCountry: '',
  brandCountryLimits: { minAmount: null, maxAmount: null },
  giftcards: [],
  images: [],
  unmatchedImages: [],

  setStep: (step: number) => set({ step }),

  setSelectedBrandCountry: (brandCountry: string, limits: { minAmount: number | null; maxAmount: number | null }) =>
    set({ selectedBrandCountry: brandCountry, brandCountryLimits: limits }),

  setGiftcards: (giftcards: SellFlowCard[]) => set({ giftcards }),

  removeGiftcard: (id: string) =>
    set((state) => {
      const card = state.giftcards.find((g) => g.id === id);
      const matchedImageId = card?.evidence?.matchedImageId;
      return {
        giftcards: state.giftcards.filter((g) => g.id !== id),
        images: matchedImageId ? state.images.filter((img) => img.id !== matchedImageId) : state.images,
        unmatchedImages: matchedImageId ? state.unmatchedImages.filter((img) => img.imageId !== matchedImageId) : state.unmatchedImages,
      };
    }),

  updateGiftcard: (id: string, field: keyof Pick<SellFlowCard, 'amount' | 'claimCode' | 'pinCode'>, value: string) =>
    set((state) => ({
      giftcards: state.giftcards.map((g) => {
        if (g.id !== id) return g;
        const updated = { ...g, [field]: field === 'amount' ? formatAmount(value) : value };
        if (field === 'amount' && g.evidence?.status === 'amount_mismatch') {
          updated.evidence = { ...g.evidence, status: 'verified' };
        }
        if (field === 'amount' && g.evidence?.status === 'amount_required' && value.trim()) {
          updated.evidence = { ...g.evidence, status: 'verified' };
        }
        return updated;
      }),
    })),

  handleBulkImport: (cards: { amount?: string; claimCode: string }[]) => {
    if (cards.length === 0) return { importedCount: 0, duplicateCount: 0, error: undefined };
    if (cards.length > MAX_BATCH_SIZE) {
      return {
        importedCount: 0,
        duplicateCount: 0,
        error: `Máximo ${MAX_BATCH_SIZE} tarjetas por batch`,
      };
    }

    let importedCount = 0;
    let duplicateCount = 0;

    set((state) => {
      const maxId = Math.max(...state.giftcards.map((g) => parseInt(g.id) || 0), 0);
      const existingCards = state.giftcards.filter(hasCardContent);
      const existingNormalized = new Set<string>();
      for (const g of existingCards) {
        const key = g.claimCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (key) existingNormalized.add(key);
      }
      const uniqueIncoming: typeof cards = [];
      for (const card of cards) {
        const key = card.claimCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (key && existingNormalized.has(key)) {
          duplicateCount++;
        } else {
          if (key) existingNormalized.add(key);
          uniqueIncoming.push(card);
        }
      }
      importedCount = uniqueIncoming.length;
      const newCards: SellFlowCard[] = uniqueIncoming.map((card, idx) => {
        const hasAmount = parseAmount(card.amount ?? '') !== null;
        return {
          id: String(maxId + idx + 1),
          amount: formatAmount(card.amount ?? ''),
          claimCode: card.claimCode,
          pinCode: '',
          source: 'bulk' as const,
          evidence: {
            status: hasAmount ? ('no_capture' as const) : ('amount_required' as const),
            matchedImageId: undefined,
            extractedCode: undefined,
            extractedAmount: undefined,
          },
        };
      });
      return { giftcards: [...existingCards, ...newCards] };
    });

    return { importedCount, duplicateCount, error: undefined };
  },

  ingestOCRDraft: (draftCards: Array<OCRDraftCard>) =>
    set((state) => {
      const existingCards = state.giftcards.filter(hasCardContent);

      const cardsByNormCode = new Map<string, SellFlowCard>();
      for (const card of existingCards) {
        const key = card.claimCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (key) cardsByNormCode.set(key, card);
      }

      const updates = new Map<string, SellFlowCard>();

      for (const draft of draftCards) {
        const draftKey = draft.claimCode?.toUpperCase().replace(/[^A-Z0-9]/g, '') ?? '';
        const existing = draftKey ? cardsByNormCode.get(draftKey) : null;

        if (!existing) continue;

        const declaredAmount = parseAmount(existing.amount);
        const extractedAmount = parseAmount(draft.amount ?? '');

        let targetStatus: 'verified' | 'amount_mismatch' | 'amount_required' = 'verified';
        let finalAmount = existing.amount;

        if (extractedAmount !== null) {
          if (declaredAmount === null) {
            targetStatus = 'amount_mismatch';
            finalAmount = formatAmount(draft.amount ?? '');
          } else if (declaredAmount !== extractedAmount) {
            targetStatus = 'amount_mismatch';
          }
        } else if (declaredAmount === null) {
          targetStatus = 'amount_required';
        }

        updates.set(existing.id, {
          ...existing,
          amount: finalAmount,
          source: existing.source,
          evidence: {
            status: targetStatus,
            matchedImageId: draft.imageId,
            extractedCode: draft.rawExtractedCode ?? draft.claimCode,
            extractedAmount: draft.rawExtractedAmount ?? draft.amount,
          },
        });
      }

      return {
        giftcards: [...existingCards.map((c) => updates.get(c.id) ?? c)] as SellFlowCard[],
      };
    }),

  acceptExtractedAmount: (cardId: string) =>
    set((state) => ({
      giftcards: state.giftcards.map((g) => {
        if (g.id !== cardId) return g;
        const extracted = formatAmount(g.evidence?.extractedAmount ?? '');
        return { ...g, amount: extracted, evidence: { ...g.evidence, status: 'verified', amountDecision: 'accept-extracted' as const } };
      }),
    })),

  keepDeclaredAmount: (cardId: string) =>
    set((state) => ({
      giftcards: state.giftcards.map((g) => {
        if (g.id !== cardId) return g;
        return { ...g, evidence: { ...g.evidence, status: 'verified', amountDecision: 'keep-declared' as const } };
      }),
    })),

  resolveAmountMismatch: (cardId: string, choice: 'accept-extracted' | 'keep-declared' | 'remove') => {
    if (choice === 'remove') {
      get().removeGiftcard(cardId);
    } else if (choice === 'accept-extracted') {
      get().acceptExtractedAmount(cardId);
    } else {
      get().keepDeclaredAmount(cardId);
    }
  },

  addImage: (image: SellFlowImage) => set((state) => ({ images: [...state.images, image] })),

  removeImage: (id: string) =>
    set((state) => ({
      images: state.images.filter((img) => img.id !== id),
      unmatchedImages: state.unmatchedImages.filter((img) => img.imageId !== id),
    })),

  clearImages: () => set({ images: [] }),

  setUnmatchedImages: (images: SellFlowUnmatchedImage[]) => set({ unmatchedImages: images }),

  addImageToCard: () => {},

  resetForm: () =>
    set({
      step: 1,
      selectedBrandCountry: '',
      brandCountryLimits: { minAmount: null, maxAmount: null },
      giftcards: [],
      images: [],
      unmatchedImages: [],
    }),
}));
