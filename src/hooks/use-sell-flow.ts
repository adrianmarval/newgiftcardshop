'use client';

import { create } from 'zustand';
import type { SellFlowState, SellFlowImage, SellFlowGiftcard, SellFlowMode, SellFlowCardEvidence } from '@/types/flows/sell-flow';
import { normalizeClaimCode } from '@/lib/utils/claim-code-parser';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultEvidence(): SellFlowCardEvidence {
  return { status: 'no_capture' };
}

function makeBlankCard(id: string, source: SellFlowGiftcard['source'] = 'manual'): SellFlowGiftcard {
  return { id, amount: '', claimCode: '', pinCode: '', source, evidence: defaultEvidence() };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSellFlow = create<SellFlowState>((set, get) => ({
  step: 1,
  selectedBrand: '',
  selectedCountry: '',
  entryMode: null,
  giftcards: [makeBlankCard('1')],
  images: [],
  unmatchedImages: [],
  lastRemovedCard: null,

  // ── Navigation ────────────────────────────────────────────────────────────
  setStep: (step) => set({ step }),

  // ── Brand / Country ──────────────────────────────────────────────────────
  setSelectedBrand: (brand) => set({ selectedBrand: brand }),
  setSelectedCountry: (country) => set({ selectedCountry: country }),

  // ── Entry mode ────────────────────────────────────────────────────────────
  setEntryMode: (mode: SellFlowMode) =>
    set((state) => {
      // Immutable once cards exist and mode is already set
      if (state.entryMode !== null) {
        const hasCards = state.giftcards.some((g) => g.claimCode || g.amount);
        if (hasCards) return state; // no-op
      }
      return { entryMode: mode };
    }),

  // ── Card management ──────────────────────────────────────────────────────
  setGiftcards: (giftcards) => set({ giftcards }),

  addGiftcard: () =>
    set((state) => {
      const newId = Math.max(...state.giftcards.map((g) => parseInt(g.id) || 0), 0) + 1;
      return {
        giftcards: [...state.giftcards, makeBlankCard(String(newId))],
      };
    }),

  removeGiftcard: (id) =>
    set((state) => {
      if (state.giftcards.length <= 1) return state;
      const index = state.giftcards.findIndex((g) => g.id === id);
      const card = state.giftcards[index];
      return {
        giftcards: state.giftcards.filter((g) => g.id !== id),
        lastRemovedCard: card ? { card, index } : state.lastRemovedCard,
      };
    }),

  undoRemoveCard: () =>
    set((state) => {
      if (!state.lastRemovedCard) return state;
      const { card, index } = state.lastRemovedCard;
      const newCards = [...state.giftcards];
      newCards.splice(index, 0, card);
      return { giftcards: newCards, lastRemovedCard: null };
    }),

  updateGiftcard: (id, field, value) =>
    set((state) => ({
      giftcards: state.giftcards.map((g) => {
        if (g.id !== id) return g;

        const updated = { ...g, [field]: value };

        // ── OCR-path amount mismatch detection ─────────────────────────────────
        // When a seller edits the amount of an OCR-ingested card, compare the
        // new value against the originally extracted amount. If they differ,
        // set evidence.status = 'amount_mismatch' to trigger the blocking resolver.
        // If they match again (user corrects back), restore to 'verified'.
        // This makes the spec scenario "GIVEN OCR associates a screenshot to a card
        // but extracts a different amount than the current card amount" reachable.
        if (field === 'amount' && g.source === 'ocr' && g.evidence.extractedAmount) {
          const normalizeAmt = (s: string) => parseFloat(s.replace(/[$,]/g, ''));
          const editedNum = normalizeAmt(value);
          const extractedNum = normalizeAmt(g.evidence.extractedAmount);
          const currentEvidenceStatus = g.evidence.status;

          // Only mutate evidence if the card has a valid OCR match (verified or currently amount_mismatch)
          if (currentEvidenceStatus === 'verified' || currentEvidenceStatus === 'amount_mismatch') {
            const mismatch = !isNaN(editedNum) && !isNaN(extractedNum) && editedNum !== extractedNum;
            if (mismatch) {
              updated.evidence = { ...g.evidence, status: 'amount_mismatch' };
              updated.validationState = 'amount_mismatch';
            } else {
              // Amounts match again — clear the mismatch
              updated.evidence = { ...g.evidence, status: 'verified' };
              updated.validationState = 'verified';
            }
          }
        }

        return updated;
      }),
    })),

  handleBulkImport: (cards) => {
    if (cards.length === 0) return { importedCount: 0, duplicateCount: 0 };

    let importedCount = 0;
    let duplicateCount = 0;

    set((state) => {
      const maxId = Math.max(...state.giftcards.map((g) => parseInt(g.id) || 0), 0);

      const existingCards =
        state.giftcards.length === 1 && !state.giftcards[0].amount && !state.giftcards[0].claimCode ? [] : state.giftcards;

      // Build a set of normalized keys from the existing batch
      const existingNormalized = new Set<string>();
      for (const g of existingCards) {
        const key = normalizeClaimCode(g.claimCode);
        if (key) existingNormalized.add(key);
      }

      // Filter incoming cards — reject those already in the active batch
      const uniqueIncoming: typeof cards = [];
      for (const card of cards) {
        const key = normalizeClaimCode(card.claimCode);
        if (key && existingNormalized.has(key)) {
          duplicateCount++;
        } else {
          if (key) existingNormalized.add(key); // prevent duplicates within incoming list too
          uniqueIncoming.push(card);
        }
      }

      importedCount = uniqueIncoming.length;

      const newCards: SellFlowGiftcard[] = uniqueIncoming.map((card, idx) => ({
        id: String(maxId + idx + 1),
        amount: card.amount ?? '',
        claimCode: card.claimCode,
        pinCode: '',
        source: 'bulk' as const,
        evidence: defaultEvidence(),
      }));

      return {
        giftcards: [...existingCards, ...newCards],
      };
    });

    return { importedCount, duplicateCount };
  },

  // ── OCR ingestion ────────────────────────────────────────────────────────
  ingestOCRDraft: (draftCards) =>
    set((state) => {
      const maxId = Math.max(...state.giftcards.map((g) => parseInt(g.id) || 0), 0);

      // Keep only blank placeholder cards (empty code + amount) from existing set
      const existingCards =
        state.giftcards.length === 1 && !state.giftcards[0].amount && !state.giftcards[0].claimCode ? [] : state.giftcards;

      // Build set of normalized keys to deduplicate
      const existingNormalized = new Set<string>();
      for (const g of existingCards) {
        const key = normalizeClaimCode(g.claimCode);
        if (key) existingNormalized.add(key);
      }

      let nextId = maxId;
      const newCards: SellFlowGiftcard[] = [];

      for (const draft of draftCards) {
        const key = draft.claimCode ? normalizeClaimCode(draft.claimCode) : null;

        // Deduplicate by claim code — empty-code rows always pass through
        if (key && existingNormalized.has(key)) continue;
        if (key) existingNormalized.add(key);

        nextId++;

        // Map ocrConfidence to initial evidence status
        const evidenceStatus = draft.ocrConfidence === 'high' ? 'verified' : draft.ocrConfidence === 'fuzzy' ? 'fuzzy_match' : 'no_capture';

        newCards.push({
          id: String(nextId),
          claimCode: draft.claimCode ?? '',
          amount: draft.amount ?? '',
          pinCode: '',
          source: 'ocr',
          evidence: {
            status: evidenceStatus,
            matchedImageId: draft.imageId,
            extractedCode: draft.claimCode,
            extractedAmount: draft.amount,
          },
        });
      }

      return {
        giftcards: [...existingCards, ...newCards],
      };
    }),

  // ── Correction actions ────────────────────────────────────────────────────
  acceptExtractedAmount: (cardId) =>
    set((state) => ({
      giftcards: state.giftcards.map((g) => {
        if (g.id !== cardId) return g;
        const extracted = g.evidence.extractedAmount ?? '';
        return {
          ...g,
          amount: extracted,
          evidence: { ...g.evidence, status: 'verified', amountDecision: 'accept-extracted' as const },
          // keep legacy fields in sync
          validationState: 'verified',
          extractedAmount: extracted,
        };
      }),
    })),

  keepDeclaredAmount: (cardId) =>
    set((state) => ({
      giftcards: state.giftcards.map((g) => {
        if (g.id !== cardId) return g;
        return {
          ...g,
          evidence: { ...g.evidence, status: 'verified', amountDecision: 'keep-declared' as const },
          validationState: 'verified',
        };
      }),
    })),

  confirmFuzzyMatch: (cardId) =>
    set((state) => ({
      giftcards: state.giftcards.map((g) => {
        if (g.id !== cardId) return g;
        return {
          ...g,
          evidence: { ...g.evidence, status: 'verified', fuzzyConfirmed: true },
          validationState: 'verified',
        };
      }),
    })),

  resolveAmountMismatch: (cardId, choice) => {
    if (choice === 'remove') {
      get().removeGiftcard(cardId);
    } else if (choice === 'accept-extracted') {
      get().acceptExtractedAmount(cardId);
    } else {
      get().keepDeclaredAmount(cardId);
    }
  },

  // ── Image management ─────────────────────────────────────────────────────
  addImage: (image: SellFlowImage) =>
    set((state) => ({
      images: [...state.images, image],
    })),

  removeImage: (id) =>
    set((state) => ({
      images: state.images.filter((img) => img.id !== id),
    })),

  clearImages: () => set({ images: [] }),

  setUnmatchedImages: (images) => set({ unmatchedImages: images }),

  // ── Validation (manual path / legacy) ────────────────────────────────────
  setCardValidationResult: (id, state, extractedCode, extractedAmount, matchedImageId) =>
    set((store) => ({
      giftcards: store.giftcards.map((g) => {
        if (g.id !== id) return g;
        return {
          ...g,
          // Update evidence sub-object
          evidence: {
            ...g.evidence,
            status: state,
            extractedCode: extractedCode ?? g.evidence.extractedCode,
            extractedAmount: extractedAmount ?? g.evidence.extractedAmount,
            matchedImageId: matchedImageId ?? g.evidence.matchedImageId,
          },
          // Keep legacy flat fields in sync
          validationState: state,
          extractedCode: extractedCode ?? g.extractedCode,
          extractedAmount: extractedAmount ?? g.extractedAmount,
          matchedImageId: matchedImageId ?? g.matchedImageId,
        };
      }),
    })),

  skipCardEvidence: (id) =>
    set((store) => ({
      giftcards: store.giftcards.map((g) => {
        if (g.id !== id) return g;
        return {
          ...g,
          evidence: { status: 'skipped' },
          validationState: 'skipped',
          extractedCode: undefined,
          extractedAmount: undefined,
          matchedImageId: undefined,
        };
      }),
    })),

  resetValidation: () =>
    set((state) => ({
      giftcards: state.giftcards.map((g) => ({
        ...g,
        evidence: defaultEvidence(),
        validationState: undefined,
        extractedCode: undefined,
        extractedAmount: undefined,
        matchedImageId: undefined,
      })),
      images: [],
      unmatchedImages: [],
    })),

  // ── Reset ────────────────────────────────────────────────────────────────
  resetForm: () =>
    set({
      step: 1,
      selectedBrand: '',
      selectedCountry: '',
      entryMode: null,
      giftcards: [makeBlankCard('1')],
      images: [],
      unmatchedImages: [],
      lastRemovedCard: null,
    }),
}));
