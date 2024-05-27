import { useFilterStore } from "@/store";
import { useGiftcardsOffers } from "./useGiftcardsOffers";

export const useFilterOffers = () => {
  const {
    activeFilters,
    filterIsOpen,
    selectedFilters,
    setSelectedFilters,
    handleFilterChange,
    handleApplyFilter,
    handleClearFilters,
    toggleFilterIsOpen,
  } = useFilterStore();

  const { getOffers } = useGiftcardsOffers();

  return {
    activeFilters,
    filterIsOpen,
    selectedFilters,
    setSelectedFilters,
    handleFilterChange,
    handleApplyFilter: () => handleApplyFilter(getOffers),
    handleClearFilters,
    toggleFilterIsOpen,
  };
};
