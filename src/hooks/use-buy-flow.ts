'use client';

import { create } from 'zustand';
import { type BuyFlowCard, type BuyFlowTierInfo } from '@/types';

// ── Re-export types (consumers import from here) ─────────────────────────────
export { type BuyFlowCard, type BuyFlowTierInfo } from '@/types';

export interface BuyFlowState {
  step: number;
  selectedBrand: string;
  selectedCountry: string;
  selectedCurrency: string;
  targetAmount: string;
  foundGiftcards: BuyFlowCard[];
  orderId: string | null;
  orderStatus: string | null;
  adjustedTotal: number | null;
  tierInfo: BuyFlowTierInfo | null;
  setStep: (step: number) => void;
  setSelectedBrand: (brand: string) => void;
  setSelectedCountry: (country: string) => void;
  setSelectedCurrency: (currency: string) => void;
  setTargetAmount: (amount: string) => void;
  setFoundGiftcards: (cards: BuyFlowCard[]) => void;
  setOrderId: (id: string | null) => void;
  setOrderStatus: (status: string | null) => void;
  setAdjustedTotal: (total: number | null) => void;
  setTierInfo: (info: BuyFlowTierInfo | null) => void;
  removeGiftcard: (id: string) => void;
  reportIssue: (id: string, status: BuyFlowCard['status'], correctedAmount?: number) => void;
  resetForm: () => void;
}

export const useBuyFlow = create<BuyFlowState>((set) => ({
  step: 1,
  selectedBrand: '',
  selectedCountry: '',
  selectedCurrency: 'USD',
  targetAmount: '',
  foundGiftcards: [],
  orderId: null,
  orderStatus: null,
  adjustedTotal: null,
  tierInfo: null,

  setStep: (step) => set({ step }),
  setSelectedBrand: (brand) => set({ selectedBrand: brand }),
  setSelectedCountry: (country) => set({ selectedCountry: country }),
  setSelectedCurrency: (currency) => set({ selectedCurrency: currency }),
  setTargetAmount: (amount) => set({ targetAmount: amount }),
  setFoundGiftcards: (cards) => set({ foundGiftcards: cards }),
  setOrderId: (id) => set({ orderId: id }),
  setOrderStatus: (status) => set({ orderStatus: status }),
  setAdjustedTotal: (total) => set({ adjustedTotal: total }),
  setTierInfo: (info) => set({ tierInfo: info }),

  removeGiftcard: (id) =>
    set((state) => ({
      foundGiftcards: state.foundGiftcards.filter((g) => g.id !== id),
    })),

  reportIssue: (id, status, correctedAmount) =>
    set((state) => ({
      foundGiftcards: state.foundGiftcards.map((g) =>
        g.id === id
          ? {
              ...g,
              status,
              reportedAmount: status === 'WRONG_AMOUNT' ? correctedAmount : undefined,
            }
          : g,
      ),
    })),

  resetForm: () =>
    set({
      step: 1,
      selectedBrand: '',
      selectedCountry: '',
      selectedCurrency: 'USD',
      targetAmount: '',
      foundGiftcards: [],
      orderId: null,
      orderStatus: null,
      adjustedTotal: null,
      tierInfo: null,
    }),
}));
