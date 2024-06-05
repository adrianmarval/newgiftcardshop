
import { FilterOption } from '@/types';
import { create } from 'zustand';

interface FilterState {
  activeFilters: FilterOption[];
  selectedFilters: FilterOption[];
  filterIsOpen: boolean;
  setActiveFilters: (filters: FilterOption[]) => void;
  setSelectedFilters: (newFilters: FilterOption[]) => void;
  toggleFilterIsOpen: () => void;
  handleFilterChange: (label: string, value: string, type: string) => void;
  handleApplyFilter: (filterOffers: (filters: FilterOption[]) => void) => void;
  handleClearFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  activeFilters: [],
  selectedFilters: [],
  filterIsOpen: false,
  setActiveFilters: (filters) => set({ activeFilters: filters }),
  setSelectedFilters: (newFilters) => set({ selectedFilters: newFilters }),
  toggleFilterIsOpen: () => set((state) => ({ filterIsOpen: !state.filterIsOpen })),
  handleFilterChange: (label, value, type) => {
    set((state) => ({
      activeFilters: state.activeFilters.some((filter) => filter.value === value && filter.type === type)
        ? state.activeFilters.filter((filter) => !(filter.value === value && filter.type === type))
        : [...state.activeFilters, { value, type, label }],
    }));
  },
  handleApplyFilter: (filterOffers) => {
    set((state) => {
      filterOffers(state.activeFilters);
      return { filterIsOpen: false, selectedFilters: state.activeFilters };
    });
  },
  handleClearFilters: () => set({ activeFilters: [], selectedFilters: [] }),
}));
