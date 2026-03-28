"use client";

import { create } from "zustand";
import { GiftCardBrand } from "@/generated/prisma/enums";

export type BuyGiftcardStatus = "UNUSED" | "INVALID" | "ALREADY_USED" | "WRONG_AMOUNT" | "DEACTIVATED";

export interface BuyGiftcardItem {
  id: string;
  brand: GiftCardBrand;
  amount: number;
  claimCode: string;
  pinCode?: string;
  status: BuyGiftcardStatus;
  reportedAmount?: number;
}

interface BuyFlowState {
  step: number;
  selectedBrand: GiftCardBrand | "";
  selectedCountry: string;
  targetAmount: string;
  foundGiftcards: BuyGiftcardItem[];
  orderId: string | null;
  
  // Actions
  setStep: (step: number) => void;
  setSelectedBrand: (brand: GiftCardBrand | "") => void;
  setSelectedCountry: (country: string) => void;
  setTargetAmount: (amount: string) => void;
  setFoundGiftcards: (cards: BuyGiftcardItem[]) => void;
  setOrderId: (id: string | null) => void;
  
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

  setStep: (step) => set({ step }),
  setSelectedBrand: (brand) => set({ selectedBrand: brand }),
  setSelectedCountry: (country) => set({ selectedCountry: country }),
  setTargetAmount: (amount) => set({ targetAmount: amount }),
  setFoundGiftcards: (cards) => set({ foundGiftcards: cards }),
  setOrderId: (id) => set({ orderId: id }),

  removeGiftcard: (id) => set((state) => ({
    foundGiftcards: state.foundGiftcards.filter(g => g.id !== id)
  })),

  reportIssue: (id, status, correctedAmount) => set((state) => ({
    foundGiftcards: state.foundGiftcards.map(g => 
      g.id === id 
        ? { ...g, status, reportedAmount: status === "WRONG_AMOUNT" ? correctedAmount : undefined } 
        : g
    )
  })),

  resetForm: () => set({
    step: 1,
    selectedBrand: "",
    selectedCountry: "US",
    targetAmount: "",
    foundGiftcards: [],
    orderId: null,
  })
}));
