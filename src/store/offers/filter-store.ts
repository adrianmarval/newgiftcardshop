import { FilterOption } from "@/offers/interfaces/filterTypes";
import { create } from "zustand";

interface FilterState {
  selectedFilters: FilterOption[];
  setSelectedFilters: (newFilters: FilterOption[]) => void;
  filterIsOpen: boolean;
  toggleFilterIsOpen: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  selectedFilters: [],
  setSelectedFilters: (newFilters) => set({ selectedFilters: newFilters }),
  filterIsOpen: false,
  toggleFilterIsOpen: () =>
    set((state) => ({ filterIsOpen: !state.filterIsOpen })),
}));
