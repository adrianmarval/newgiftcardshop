'use client';

import { create } from 'zustand';
import type { BuyFlowState } from '@/types';

export const useBuyFlow = create<BuyFlowState>((set) => ({
  step: 1,
  selectedBrand: '',
  selectedCountry: '',
  selectedCurrency: 'USD',
  targetAmount: '',
  foundGiftcards: [],
  orderId: null,
  adjustedTotal: null,
  tierInfo: null,

  setStep: (step) => set({ step }),
  setSelectedBrand: (brand) => set({ selectedBrand: brand }),
  setSelectedCountry: (country) => set({ selectedCountry: country }),
  setSelectedCurrency: (currency) => set({ selectedCurrency: currency }),
  setTargetAmount: (amount) => set({ targetAmount: amount }),
  setFoundGiftcards: (cards) => set({ foundGiftcards: cards }),
  setOrderId: (id) => set({ orderId: id }),
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
      adjustedTotal: null,
      tierInfo: null,
    }),
}));
