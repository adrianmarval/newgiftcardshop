"use client";

import { create } from "zustand";
import type { GiftCardItem, SellFlowState } from "@/types";

export const useSellFlow = create<SellFlowState>((set) => ({
  step: 1,
  selectedBrand: "",
  selectedCountry: "",
  giftcards: [{ id: "1", amount: "", claimCode: "", pinCode: "" }],

  setStep: (step) => set({ step }),
  setSelectedBrand: (brand) => set({ selectedBrand: brand }),
  setSelectedCountry: (country) => set({ selectedCountry: country }),
  setGiftcards: (giftcards) => set({ giftcards }),

  addGiftcard: () => set((state) => {
    const newId = Math.max(...state.giftcards.map(g => parseInt(g.id) || 0), 0) + 1;
    return {
      giftcards: [...state.giftcards, { id: String(newId), amount: "", claimCode: "", pinCode: "" }]
    };
  }),

  removeGiftcard: (id) => set((state) => ({
    giftcards: state.giftcards.length > 1 
      ? state.giftcards.filter(g => g.id !== id)
      : state.giftcards
  })),

  updateGiftcard: (id, field, value) => set((state) => ({
    giftcards: state.giftcards.map(g =>
      g.id === id ? { ...g, [field]: value } : g
    )
  })),

  handleBulkImport: (cards) => set((state) => {
    if (cards.length === 0) return state;
    
    // Get the max current ID
    const maxId = Math.max(...state.giftcards.map(g => parseInt(g.id) || 0), 0);
    
    // Filter out initial empty card if it's the only one
    const existingCards = state.giftcards.length === 1 && !state.giftcards[0].amount && !state.giftcards[0].claimCode
      ? []
      : state.giftcards;

    const newCards = cards.map((card, idx) => ({
      id: String(maxId + idx + 1),
      amount: card.amount,
      claimCode: card.claimCode,
      pinCode: ""
    }));
    
    return {
      giftcards: [...existingCards, ...newCards]
    };
  }),

  resetForm: () => set({
    step: 1,
    selectedBrand: "",
    selectedCountry: "",
    giftcards: [{ id: "1", amount: "", claimCode: "", pinCode: "" }]
  })
}));
