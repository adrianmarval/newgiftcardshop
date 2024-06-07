
import { FilterOption } from '@/interfaces/filter-interface';
import { create } from 'zustand';

interface FilterStore {
  activeFilters: FilterOption[];
  filterIsOpen: boolean;
  addFilter: (filter: FilterOption) => void;
  removeFilter: (filter: FilterOption) => void;
  clearFilters: () => void;
  toggleFilterIsOpen: () => void;
}

export const useFilterStore = create<FilterStore>((set) => ({
  activeFilters: [],
  filterIsOpen: false,
  addFilter: (filter) =>
    set((state) => ({
      activeFilters: [...state.activeFilters, filter],
    })),
  removeFilter: (filter) =>
    set((state) => ({
      activeFilters: state.activeFilters.filter((f) => !(f.type === filter.type && f.value === filter.value)),
    })),
  clearFilters: () => set({ activeFilters: [] }),
  toggleFilterIsOpen: () => set((state) => ({ filterIsOpen: !state.filterIsOpen })),
}));
