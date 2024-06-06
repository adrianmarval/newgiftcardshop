import { create } from 'zustand';

interface Filter {
  type: string;
  value: string;
  label: string;
}

interface FilterStore {
  activeFilters: Filter[];
  filterIsOpen: boolean;
  setActiveFilters: (filters: Filter[]) => void;
  addFilter: (filter: Filter) => void;
  removeFilter: (filter: Filter) => void;
  clearFilters: () => void;
  toggleFilterIsOpen: () => void;
}

export const useFilterStore = create<FilterStore>((set) => ({
  activeFilters: [],
  filterIsOpen: false,
  setActiveFilters: (filters) => set({ activeFilters: filters }),
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
