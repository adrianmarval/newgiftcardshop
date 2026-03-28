"use client";

import { create } from "zustand";
import { GiftCardBrand } from "@/generated/prisma/enums";

export interface GiftCardItem {
  id: string;
  amount: string;
  claimCode: string;
  pinCode?: string;
}

interface SellFlowState {
  step: number;
  selectedBrand: GiftCardBrand | "";
  selectedCountry: string;
  giftcards: GiftCardItem[];
  
  // Actions
  setStep: (step: number) => void;
  setSelectedBrand: (brand: GiftCardBrand | "") => void;
  setSelectedCountry: (country: string) => void;
  setGiftcards: (giftcards: GiftCardItem[]) => void;
  
  addGiftcard: () => void;
  removeGiftcard: (id: string) => void;
  updateGiftcard: (id: string, field: keyof GiftCardItem, value: string) => void;
  handleBulkImport: (cards: { amount: string; claimCode: string }[]) => void;
  resetForm: () => void;
}

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
