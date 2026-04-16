'use client';

import { create } from 'zustand';
import type { SellFlowState, SellFlowImage, SellFlowGiftcard, SellFlowCardEvidence } from '@/types/flows/sell-flow';
import { normalizeClaimCode } from '@/lib/utils/claim-code-parser';
import { ValidationState } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultEvidence(): SellFlowCardEvidence {
  return { status: 'no_capture' };
}

function makeBlankCard(id: string, source: SellFlowGiftcard['source'] = 'manual'): SellFlowGiftcard {
  return { id, amount: '', claimCode: '', pinCode: '', source, evidence: defaultEvidence() };
}

function hasCardContent(card: SellFlowGiftcard): boolean {
  return !!(card.amount || card.claimCode || card.pinCode);
}

function parseAmount(value?: string): number | null {
  if (!value) return null;
  const normalized = Number.parseFloat(value.replace(/[$,]/g, ''));
  return Number.isFinite(normalized) ? normalized : null;
}

function formatAmount(value?: string): string {
  const parsed = parseAmount(value);
  if (parsed === null) return value?.trim() ?? '';
  return parsed.toFixed(2);
}

function getFuzzyCandidate(
  extractedClaimCode: string | undefined,
  extractedAmount: string | undefined,
  cards: SellFlowGiftcard[],
  usedMatches: Set<string>,
): SellFlowGiftcard | null {
  if (!extractedClaimCode) return null;
  if (!extractedAmount) return null;

  const extracted = normalizeClaimCode(extractedClaimCode);
  if (!extracted) return null;
  const extractedAmountNumber = parseAmount(extractedAmount);

  let bestCard: SellFlowGiftcard | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const card of cards) {
    if (usedMatches.has(card.id)) continue;
    const candidate = normalizeClaimCode(card.claimCode);
    if (!candidate) continue;
    if (candidate.length !== extracted.length) continue;

    const candidateAmount = parseAmount(card.amount);
    if (extractedAmountNumber !== null && candidateAmount !== null && extractedAmountNumber !== candidateAmount) {
      continue;
    }

    let distance = 0;
    for (let i = 0; i < extracted.length; i++) {
      if (extracted[i] !== candidate[i]) distance++;
      if (distance > 1) break;
    }

    if (distance <= 1 && distance < bestDistance) {
      bestDistance = distance;
      bestCard = card;
    }
  }

  return bestCard;
}

function buildEvidenceFromDraft(
  draft: { claimCode?: string; amount?: string; imageId?: string; rawExtractedCode?: string; rawExtractedAmount?: string },
  status: SellFlowCardEvidence['status'],
): SellFlowCardEvidence {
  return {
    status,
    matchedImageId: draft.imageId,
    extractedCode: draft.rawExtractedCode ?? draft.claimCode,
    extractedAmount: draft.rawExtractedAmount ?? draft.amount,
  };
}

function clearEvidence(card: SellFlowGiftcard): SellFlowGiftcard {
  return {
    ...card,
    evidence: { status: 'no_capture' },
    validationState: 'no_capture',
    extractedCode: undefined,
    extractedAmount: undefined,
    matchedImageId: undefined,
  };
}

function clearEvidenceForImage(card: SellFlowGiftcard, imageId: string): SellFlowGiftcard {
  const matchedImageId = card.evidence?.matchedImageId ?? card.matchedImageId;
  return matchedImageId === imageId ? clearEvidence(card) : card;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSellFlow = create<SellFlowState>((set, get) => ({
  step: 1,
  selectedBrand: '',
  selectedCountry: '',
  giftcards: [],
  images: [],
  unmatchedImages: [],
  lastRemovedCard: null,

  // ── Navigation ────────────────────────────────────────────────────────────
  setStep: (step) => set({ step }),

  // ── Brand / Country ──────────────────────────────────────────────────────
  setSelectedBrand: (brand) => set({ selectedBrand: brand }),
  setSelectedCountry: (country) => set({ selectedCountry: country }),

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
      const index = state.giftcards.findIndex((g) => g.id === id);
      const card = state.giftcards[index];
      const matchedImageId = card?.evidence?.matchedImageId ?? card?.matchedImageId;
      return {
        giftcards: state.giftcards.filter((g) => g.id !== id),
        images: matchedImageId ? state.images.filter((img) => img.id !== matchedImageId) : state.images,
        unmatchedImages: matchedImageId ? state.unmatchedImages.filter((img) => img.imageId !== matchedImageId) : state.unmatchedImages,
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

        const updated = { ...g, [field]: field === 'amount' ? formatAmount(value) : value };

        // ── OCR-path amount mismatch detection ─────────────────────────────────
        // When a seller edits the amount of an OCR-ingested card, compare the
        // new value against the originally extracted amount. If they differ,
        // set evidence.status = 'amount_mismatch' to trigger the blocking resolver.
        // If they match again (user corrects back), restore to 'verified'.
        // Also: if status was 'amount_not_found', clearing the amount field
        // to a valid value restores the card to 'verified'.
        if (field === 'amount' && g.source === 'ocr') {
          const normalizeAmt = (s: string) => parseFloat(s.replace(/[$,]/g, ''));
          const editedNum = normalizeAmt(value);
          const currentEvidenceStatus = g.evidence.status;

          // Resolve amount_not_found -> verified
          if (currentEvidenceStatus === 'amount_not_found' && !isNaN(editedNum)) {
            updated.evidence = { ...g.evidence, status: 'verified' };
            updated.validationState = 'verified';
          }
          // Handle mismatch detection if we have an extracted amount to compare against
          else if (g.evidence.extractedAmount && (currentEvidenceStatus === 'verified' || currentEvidenceStatus === 'amount_mismatch')) {
            const extractedNum = normalizeAmt(g.evidence.extractedAmount);
            const mismatch = !isNaN(editedNum) && !isNaN(extractedNum) && editedNum !== extractedNum;
            if (mismatch) {
              updated.evidence = { ...g.evidence, status: 'amount_mismatch' };
              updated.validationState = 'amount_mismatch';
            } else {
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

      const existingCards = state.giftcards.filter(hasCardContent);

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
        amount: formatAmount(card.amount ?? ''),
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

      const existingCards = state.giftcards.filter(hasCardContent);
      const cardsByNormalizedCode = new Map<string, SellFlowGiftcard>();
      const usedMatches = new Set<string>();

      for (const card of existingCards) {
        const key = normalizeClaimCode(card.claimCode);
        if (key) cardsByNormalizedCode.set(key, card);
      }

      let nextId = maxId;
      const newCards: SellFlowGiftcard[] = [];
      const updates = new Map<string, SellFlowGiftcard>();

      for (const draft of draftCards) {
        const key = draft.claimCode ? normalizeClaimCode(draft.claimCode) : null;

        if (key) {
          const existing = cardsByNormalizedCode.get(key);
          if (existing && !usedMatches.has(existing.id)) {
            usedMatches.add(existing.id);
            const declaredAmount = parseAmount(existing.amount);
            const extractedAmount = parseAmount(draft.amount);
            const hasAmountMismatch = declaredAmount !== null && extractedAmount !== null && declaredAmount !== extractedAmount;
            const isMissingAmount = extractedAmount === null && declaredAmount === null;

            const targetStatus = hasAmountMismatch ? 'amount_mismatch' : isMissingAmount ? 'amount_not_found' : 'verified';

            updates.set(existing.id, {
              ...existing,
              source: existing.source,
              evidence: buildEvidenceFromDraft(draft, targetStatus),
              validationState: targetStatus,
              extractedCode: draft.rawExtractedCode ?? draft.claimCode,
              extractedAmount: draft.rawExtractedAmount ?? draft.amount,
              matchedImageId: draft.imageId,
            });
            continue;
          }
        }

        const fuzzyExisting = getFuzzyCandidate(draft.claimCode, draft.amount, existingCards, usedMatches);
        if (fuzzyExisting) {
          usedMatches.add(fuzzyExisting.id);
          updates.set(fuzzyExisting.id, {
            ...fuzzyExisting,
            source: fuzzyExisting.source,
            evidence: buildEvidenceFromDraft(draft, 'fuzzy_match'),
            validationState: 'fuzzy_match',
            extractedCode: draft.rawExtractedCode ?? draft.claimCode,
            extractedAmount: draft.rawExtractedAmount ?? draft.amount,
            matchedImageId: draft.imageId,
          });
          continue;
        }

        nextId++;
        const draftAmount = parseAmount(draft.amount);
        let evidenceStatus: ValidationState =
          draft.ocrConfidence === 'high' ? 'verified' : draft.ocrConfidence === 'fuzzy' ? 'fuzzy_match' : 'no_capture';

        // Override verified if amount is missing
        if (evidenceStatus === 'verified' && draftAmount === null) {
          evidenceStatus = 'amount_not_found';
        }

        newCards.push({
          id: String(nextId),
          claimCode: draft.claimCode ?? '',
          amount: formatAmount(draft.amount ?? ''),
          pinCode: '',
          source: 'ocr',
          evidence: buildEvidenceFromDraft(draft, evidenceStatus),
          validationState: evidenceStatus,
          extractedCode: draft.rawExtractedCode ?? draft.claimCode,
          extractedAmount: draft.rawExtractedAmount ?? draft.amount,
          matchedImageId: draft.imageId,
        });
      }

      return {
        giftcards: [...existingCards.map((card) => updates.get(card.id) ?? card), ...newCards],
      };
    }),

  // ── Correction actions ────────────────────────────────────────────────────
  acceptExtractedAmount: (cardId) =>
    set((state) => ({
      giftcards: state.giftcards.map((g) => {
        if (g.id !== cardId) return g;
        const extracted = formatAmount(g.evidence.extractedAmount ?? '');
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

  rejectFuzzyMatch: (cardId) =>
    set((state) => {
      const card = state.giftcards.find((g) => g.id === cardId);
      if (!card || (card.evidence?.status ?? card.validationState) !== 'fuzzy_match') {
        return state;
      }

      const extractedCode = card.evidence?.extractedCode ?? card.extractedCode;
      const extractedAmount = formatAmount(card.evidence?.extractedAmount ?? card.extractedAmount ?? '');
      const matchedImageId = card.evidence?.matchedImageId ?? card.matchedImageId;

      if (!extractedCode || !matchedImageId) {
        return {
          giftcards: state.giftcards.map((g) => (g.id === cardId ? clearEvidence(g) : g)),
        };
      }

      const maxId = Math.max(...state.giftcards.map((g) => parseInt(g.id) || 0), 0);
      const newCard: SellFlowGiftcard = {
        id: String(maxId + 1),
        claimCode: extractedCode,
        amount: extractedAmount,
        pinCode: '',
        source: 'ocr',
        evidence: {
          status: 'verified',
          matchedImageId,
          extractedCode,
          extractedAmount,
        },
        validationState: 'verified',
        extractedCode,
        extractedAmount,
        matchedImageId,
      };

      return {
        giftcards: [...state.giftcards.map((g) => (g.id === cardId ? clearEvidence(g) : g)), newCard],
      };
    }),

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
      unmatchedImages: state.unmatchedImages.filter((img) => img.imageId !== id),
      giftcards: state.giftcards.map((card) => clearEvidenceForImage(card, id)),
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

  // ── Reset ────────────────────────────────────────────────────────────────
  resetForm: () =>
    set({
      step: 1,
      selectedBrand: '',
      selectedCountry: '',
      giftcards: [],
      images: [],
      unmatchedImages: [],
      lastRemovedCard: null,
    }),
}));
