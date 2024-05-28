import { create } from 'zustand';
import { GiftcardOffer } from '@/offers/interfaces/offer-interface';

interface FiltersState {
  offers: GiftcardOffer[];
  isLoading: boolean;
  setOffers: (offers: GiftcardOffer[]) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export const offersStore = create<FiltersState>((set) => ({
  offers: [],
  isLoading: false,
  setOffers: (offers) => set({ offers }),
  setIsLoading: (isLoading) => set({ isLoading }),
}));
