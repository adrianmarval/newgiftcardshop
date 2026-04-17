'use client';

import { create } from 'zustand';
import type { SellFlowState, SellFlowImage, SellFlowGiftcard, SellFlowCardEvidence } from '@/types/flows/sell-flow';
import { normalizeClaimCode, formatClaimCodeCanonical } from '@/lib/utils/claim-code-parser';
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
  // NOTE: Do NOT bail if extractedAmount is missing.
  // The loop's amount filter (line 57) only rejects when BOTH amounts
  // are present AND they differ — which is the correct "monto matching"
  // behavior described in the skill.  When the OCR can't read the amount
  // we still want fuzzy code matching to fire (Scenario #4).

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

        // ── Validation state sync on amount edit ───────────────────────────────
        // When a seller edits the amount of a card that has evidence, we must
        // re-validate the state against any available OCR data.
        if (field === 'amount') {
          const normalizeAmt = (s: string) => parseFloat(s.replace(/[$,]/g, ''));
          const editedNum = normalizeAmt(value);
          const evidence = g.evidence;
          const currentStatus = evidence.status;

          // 1. Resolve amount_not_found -> verified (regardless of source)
          if (currentStatus === 'amount_not_found' && !isNaN(editedNum)) {
            updated.evidence = { ...evidence, status: 'verified' };
            updated.validationState = 'verified';
          }
          // 2. Handle mismatch detection if we have an extracted amount to compare against
          else if (evidence.extractedAmount && (currentStatus === 'verified' || currentStatus === 'amount_mismatch')) {
            const extractedNum = normalizeAmt(evidence.extractedAmount);
            const mismatch = !isNaN(editedNum) && !isNaN(extractedNum) && editedNum !== extractedNum;
            
            const targetStatus = mismatch ? 'amount_mismatch' : 'verified';
            updated.evidence = { ...evidence, status: targetStatus };
            updated.validationState = targetStatus;
          }
        }

        return updated;
      }),
    })),

  handleBulkImport: (cards) => {
    if (cards.length === 0) return { importedCount: 0, duplicateCount: 0 };

    console.group(`[INGEST-BULK] Processing ${cards.length} pasted cards`);
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

    console.log(`[INGEST-BULK] Result: ${importedCount} imported, ${duplicateCount} duplicates skipped`);
    console.groupEnd();

    return { importedCount, duplicateCount };
  },

  ingestOCRDraft: (draftCards, ignoredImages = []) =>
    set((state) => {
      console.group(`[INGEST-OCR] Processing ${draftCards.length} AI draft results`);
      if (ignoredImages.length > 0) {
        console.log(`[INGEST-OCR] ${ignoredImages.length} images were unreadable/unmatched and will go to gallery.`);
      }
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

      // Deduplicate incoming drafts by normalized code — if two images
      // produce the same code, keep only the first draft and DISCARD the second image
      // (prevents duplicate cards and orphaned images from redundant screenshots).
      const seenDraftCodes = new Set<string>();
      const discardedImageIds: string[] = [];

      // Pre-populate seen codes with cards that already have a matched image
      // from previous ingestion batches (prevents redundant screenshots
      // from different files showing up as Unmatched).
      for (const card of state.giftcards) {
        const k = normalizeClaimCode(card.claimCode);
        if (k && card.matchedImageId) {
          seenDraftCodes.add(k);
        }
      }

      const uniqueDrafts = draftCards.filter((draft) => {
        const dk = draft.claimCode ? normalizeClaimCode(draft.claimCode) : null;
        if (!dk) return true; // no code to dedup → keep (will be handled downstream)
        if (seenDraftCodes.has(dk)) {
          console.log(`[INGEST-OCR] Skipping duplicate draft code: ${dk} (Image: ${draft.imageId})`);
          if (draft.imageId) discardedImageIds.push(draft.imageId);
          return false; // duplicate → skip
        }
        seenDraftCodes.add(dk);
        return true;
      });

      for (const draft of uniqueDrafts) {
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

            // Auto-fill: user didn't declare amount but OCR found one → adopt it
            const resolvedAmount = declaredAmount === null && extractedAmount !== null ? formatAmount(draft.amount ?? '') : existing.amount;

            console.log(`[INGEST-OCR] Match Found! Code ${key} linked to card ${existing.id} (Status: ${targetStatus})`);

            updates.set(existing.id, {
              ...existing,
              amount: resolvedAmount,
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
          console.log(`[INGEST-OCR] Fuzzy Match! Extracted ${draft.claimCode} matched with card ${fuzzyExisting.id} (${fuzzyExisting.claimCode})`);
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

        console.log(`[INGEST-OCR] No match found for extraction ${draft.claimCode || 'Manual'}. Creating NEW card ${nextId}`);
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

      console.groupEnd();

      return {
        giftcards: [...existingCards.map((card) => updates.get(card.id) ?? card), ...newCards],
        // Clean up images that belonged to rejected duplicate drafts
        images: state.images.filter((img) => !discardedImageIds.includes(img.id)),
        // Populate unmatched gallery
        unmatchedImages: ignoredImages.map((img) => ({ imageId: img.imageId, reason: img.reason })),
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
        // Adopt the code from the photo when the user confirms it is correct
        const extracted = g.evidence.extractedCode || g.extractedCode;
        const normalized = extracted ? normalizeClaimCode(extracted) : null;
        const finalCode = normalized ? formatClaimCodeCanonical(normalized) : g.claimCode;

        return {
          ...g,
          claimCode: finalCode,
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

  // ── Agregar imagen a tarjeta específica con validación OCR ──────────────────
  addImageToCard: (
    cardId: string,
    imageData: { imageId: string; compressedData: string; previewUrl: string },
    extractedClaimCode: string | null,
    extractedAmount: string | null,
  ) =>
    set((state) => {
      const card = state.giftcards.find((g) => g.id === cardId);
      if (!card) return state;

      // Determinar estado basado en matching
      let status: ValidationState = 'no_capture';
      const normalizedCardCode = normalizeClaimCode(card.claimCode);
      const normalizedExtractedCode = extractedClaimCode ? normalizeClaimCode(extractedClaimCode) : null;

      if (normalizedCardCode && normalizedExtractedCode) {
        if (normalizedCardCode === normalizedExtractedCode) {
          const cardAmount = parseAmount(card.amount);
          const extractedAmt = extractedAmount ? parseAmount(extractedAmount) : null;
          status = extractedAmt !== null && cardAmount !== null && extractedAmt !== cardAmount ? 'amount_mismatch' : 'verified';
        } else {
          // Fuzzy match check (dist <= 1)
          let distance = 0;
          for (let i = 0; i < normalizedCardCode.length && i < normalizedExtractedCode.length; i++) {
            if (normalizedCardCode[i] !== normalizedExtractedCode[i]) distance++;
            if (distance > 1) break;
          }
          if (distance <= 1 && normalizedCardCode.length === normalizedExtractedCode.length) {
            status = 'fuzzy_match';
          } else {
            status = 'capture_mismatch';
          }
        }
      } else {
        status = 'capture_mismatch';
      }

      // NO agregamos la imagen al store ni actualizamos la tarjeta si hay mismatch total según el usuario
      // (pero el store debe permitirlo si el componente decide llamar a esta función).
      // El componente "ReviewStep" se encargará de NO llamar a esta función si status === 'capture_mismatch'
      // o de manejar el error. Pero para ser consistentes, si se llama, actualizamos.

      const newImage: SellFlowImage = {
        id: imageData.imageId,
        compressedData: imageData.compressedData,
        previewUrl: imageData.previewUrl,
      };

      return {
        images: [...state.images, newImage],
        giftcards: state.giftcards.map((g) => {
          if (g.id !== cardId) return g;
          return {
            ...g,
            evidence: {
              status,
              matchedImageId: imageData.imageId,
              extractedCode: extractedClaimCode ?? undefined,
              extractedAmount: extractedAmount ?? undefined,
            },
            validationState: status,
            matchedImageId: imageData.imageId,
            extractedCode: extractedClaimCode ?? undefined,
            extractedAmount: extractedAmount ?? undefined,
          };
        }),
      };
    }),

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
