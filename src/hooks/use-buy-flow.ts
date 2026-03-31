"use client";

import { create } from "zustand";
import type { BuyGiftcardStatus, BuyGiftcardItem } from "@/types";



interface BuyFlowState {
  step: number;
  selectedBrand: string;
  selectedCountry: string;
  targetAmount: string;
  foundGiftcards: BuyGiftcardItem[];
  orderId: string | null;
  /** Set after confirmOrderUsage succeeds — the server-calculated adjusted total. */
  adjustedTotal: number | null;

  // Actions
  setStep: (step: number) => void;
  setSelectedBrand: (brand: string) => void;
  setSelectedCountry: (country: string) => void;
  setTargetAmount: (amount: string) => void;
  setFoundGiftcards: (cards: BuyGiftcardItem[]) => void;
  setOrderId: (id: string | null) => void;
  setAdjustedTotal: (total: number | null) => void;

  removeGiftcard: (id: string) => void;
  reportIssue: (id: string, status: BuyGiftcardStatus, correctedAmount?: number) => void;
  resetForm: () => void;
}

export const useBuyFlow = create<BuyFlowState>((set) => ({
  step: 1,
  selectedBrand: "",
  selectedCountry: "US",
  targetAmount: "",
  foundGiftcards: [],
  orderId: null,
  adjustedTotal: null,

  setStep: (step) => set({ step }),
  setSelectedBrand: (brand) => set({ selectedBrand: brand }),
  setSelectedCountry: (country) => set({ selectedCountry: country }),
  setTargetAmount: (amount) => set({ targetAmount: amount }),
  setFoundGiftcards: (cards) => set({ foundGiftcards: cards }),
  setOrderId: (id) => set({ orderId: id }),
  setAdjustedTotal: (total) => set({ adjustedTotal: total }),

  removeGiftcard: (id) => set((state) => ({
    foundGiftcards: state.foundGiftcards.filter(g => g.id !== id),
  })),

  reportIssue: (id, status, correctedAmount) => set((state) => ({
    foundGiftcards: state.foundGiftcards.map(g =>
      g.id === id
        ? { ...g, status, reportedAmount: status === "WRONG_AMOUNT" ? correctedAmount : undefined }
        : g
    ),
  })),

  resetForm: () => set({
    step: 1,
    selectedBrand: "",
    selectedCountry: "US",
    targetAmount: "",
    foundGiftcards: [],
    orderId: null,
    adjustedTotal: null,
  }),
}));
