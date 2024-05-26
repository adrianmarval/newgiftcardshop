import { useFilterStore } from "@/store";
import { useState } from "react";
import { useGiftcardsOffers } from "./useGiftcardsOffers";

export const useFilterOffers = () => {
  const { setSelectedFilters, filterIsOpen, toggleFilterIsOpen } =
    useFilterStore();
  const [activeFilters, setActiveFilters] = useState<
    { value: string; type: string }[]
  >([]);
  const { filterOffers } = useGiftcardsOffers();

  const handleFilterChange = (label: string, value: string, type: string) => {
    setActiveFilters((prev) => {
      const existingIndex = prev.findIndex(
        (filter) => filter.value === value && filter.type === type,
      );

      if (existingIndex !== -1) {
        return prev.filter((_, i) => i !== existingIndex);
      } else {
        return [...prev, { value, type }];
      }
    });
  };

  const handleApplyFilter = () => {
    filterOffers(activeFilters);
    toggleFilterIsOpen();
  };

  const handleClearFilters = () => {
    setActiveFilters([]);
    setSelectedFilters([]);
  };

  return {
    activeFilters,
    handleFilterChange,
    handleApplyFilter,
    handleClearFilters,
    toggleFilterIsOpen,
    filterIsOpen,
  };
};
