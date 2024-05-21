import { create } from "zustand";
import { ReactSelectFilter } from "@/types";

interface FiltersState {
  offersFilters: ReactSelectFilter[];
  setOffersFilters: (filters: ReactSelectFilter[]) => void;
}

export const offersStore = create<FiltersState>((set) => ({
  offersFilters: [],
  setOffersFilters: (offersFilters) => set({ offersFilters }),
}));
