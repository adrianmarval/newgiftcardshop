'use client';

import { create } from 'zustand';
import type { SellFlowState, SellFlowImage, SellFlowCard, SellFlowCardEvidence } from '@/types/application/sell-flow';

function defaultEvidence(): SellFlowCardEvidence {
  return { status: 'no_capture' };
}

function makeBlankCard(id: string, source: SellFlowCard['source'] = 'manual'): SellFlowCard {
  return { id, amount: '', claimCode: '', pinCode: '', source, evidence: defaultEvidence() };
}

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

  // Si ya tiene formato válido de dollars, devolver limpio
  const parsed = parseAmount(trimmed);
  if (parsed === null) return trimmed;

  // Si es entero como "50", convertir a "50.00"
  if (/^\d+$/.test(trimmed)) {
    return parsed.toFixed(2);
  }

  //Si tiene punto, asegurar max 2 decimales
  if (trimmed.includes('.')) {
    const [int, dec] = trimmed.split('.');
    const cleanInt = int.replace(/[$,]/g, '') || '0';
    const cleanDec = dec.slice(0, 2).padEnd(2, '0');
    return `${cleanInt}.${cleanDec}`;
  }

  //Si tiene coma como decimal
  if (trimmed.includes(',')) {
    const [int, dec] = trimmed.split(',');
    const cleanInt = int.replace(/[$,]/g, '') || '0';
    const cleanDec = dec.slice(0, 2).padEnd(2, '0');
    return `${cleanInt}.${cleanDec}`;
  }

  return parsed.toFixed(2);
}

export const useSellFlow = create<SellFlowState>((set, get) => ({
  step: 1,
  selectedBrand: '',
  selectedCountry: '',
  giftcards: [],
  images: [],
  unmatchedImages: [],

  setStep: (step) => set({ step }),

  setSelectedBrand: (brand) => set({ selectedBrand: brand }),
  setSelectedCountry: (country) => set({ selectedCountry: country }),

  setGiftcards: (giftcards) => set({ giftcards }),

  removeGiftcard: (id) =>
    set((state) => {
      const card = state.giftcards.find((g) => g.id === id);
      const matchedImageId = card?.evidence?.matchedImageId;
      return {
        giftcards: state.giftcards.filter((g) => g.id !== id),
        images: matchedImageId ? state.images.filter((img) => img.id !== matchedImageId) : state.images,
        unmatchedImages: matchedImageId ? state.unmatchedImages.filter((img) => img.imageId !== matchedImageId) : state.unmatchedImages,
      };
    }),

  updateGiftcard: (id, field, value) =>
    set((state) => ({
      giftcards: state.giftcards.map((g) => {
        if (g.id !== id) return g;
        const updated = { ...g, [field]: field === 'amount' ? formatAmount(value) : value };
        // Desbloquear al cambiar monto cuando estaba bloqueado
        if (field === 'amount' && g.evidence?.status === 'amount_mismatch') {
          updated.evidence = { ...g.evidence, status: 'verified' };
        }
        if (field === 'amount' && g.evidence?.status === 'amount_required' && value.trim()) {
          updated.evidence = { ...g.evidence, status: 'verified' };
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

    return { importedCount, duplicateCount };
  },

  ingestOCRDraft: (draftCards) =>
    set((state) => {
      const maxId = Math.max(...state.giftcards.map((g) => parseInt(g.id) || 0), 0);
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
          // La imagen tiene monto
          if (declaredAmount === null) {
            // Card sin monto → ask confirmar
            targetStatus = 'amount_mismatch';
            finalAmount = formatAmount(draft.amount ?? '');
          } else if (declaredAmount !== extractedAmount) {
            // Ambos tienen monto pero difieren
            targetStatus = 'amount_mismatch';
          }
        } else if (declaredAmount === null) {
          // Card sin monto Y imagen sin monto → BLOQUEA
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

  acceptExtractedAmount: (cardId) =>
    set((state) => ({
      giftcards: state.giftcards.map((g) => {
        if (g.id !== cardId) return g;
        const extracted = formatAmount(g.evidence?.extractedAmount ?? '');
        return { ...g, amount: extracted, evidence: { ...g.evidence, status: 'verified', amountDecision: 'accept-extracted' as const } };
      }),
    })),

  keepDeclaredAmount: (cardId) =>
    set((state) => ({
      giftcards: state.giftcards.map((g) => {
        if (g.id !== cardId) return g;
        return { ...g, evidence: { ...g.evidence, status: 'verified', amountDecision: 'keep-declared' as const } };
      }),
    })),

  confirmFuzzyMatch: () => {},

  rejectFuzzyMatch: () => {},

  resolveAmountMismatch: (cardId, choice) => {
    if (choice === 'remove') {
      get().removeGiftcard(cardId);
    } else if (choice === 'accept-extracted') {
      get().acceptExtractedAmount(cardId);
    } else {
      get().keepDeclaredAmount(cardId);
    }
  },

  addImage: (image: SellFlowImage) => set((state) => ({ images: [...state.images, image] })),

  removeImage: (id) =>
    set((state) => ({
      images: state.images.filter((img) => img.id !== id),
      unmatchedImages: state.unmatchedImages.filter((img) => img.imageId !== id),
    })),

  clearImages: () => set({ images: [] }),

  setUnmatchedImages: (images) => set({ unmatchedImages: images }),

  addImageToCard: () => {},

  resetForm: () =>
    set({
      step: 1,
      selectedBrand: '',
      selectedCountry: '',
      giftcards: [],
      images: [],
      unmatchedImages: [],
    }),
}));
