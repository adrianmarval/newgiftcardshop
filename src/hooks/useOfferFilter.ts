import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useFilterStore } from '@/store/filter-store';
import { useEffect } from 'react';
import { FilterOption, filterOptions } from '@/interfaces/filter-interface';

export const useOfferFilter = (category: string) => {
  const { activeFilters, filterIsOpen, addFilter, removeFilter, clearFilters, toggleFilterIsOpen } = useFilterStore();
  const pathName = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const filtersFromUrl: FilterOption[] = [];

    searchParams.forEach((value, key) => {
      const label = filterOptions[category]?.find((opt) => opt.type === key)?.options.find((o) => o.value === value)?.label || value;
      filtersFromUrl.push({ type: key, value, label });
    });

    if (filtersFromUrl.length > 0) {
      // Update the filter store with filters from the URL
      filtersFromUrl.forEach(addFilter);
    }

    return () => clearFilters(); // Keep this to clear filters when unmounting
  }, []);

  const handleApplyFilter = () => {
    const searchFilters = Object.fromEntries(searchParams);
    const filters: FilterOption[] = activeFilters.map(({ type, value }) => ({
      type,
      value,
      label: filterOptions[category]?.find((opt) => opt.type === type)?.options.find((o) => o.value === value)?.label || value,
    }));

    const updatedParams = new URLSearchParams(searchFilters);

    // Limpiar los parámetros existentes y añadir los nuevos
    Object.keys(searchFilters).forEach((key) => {
      updatedParams.delete(key);
    });

    // Añadir filtros múltiples al URLSearchParams
    filters.forEach((filter) => {
      updatedParams.has(filter.type) ? updatedParams.append(filter.type, filter.value) : updatedParams.set(filter.type, filter.value);
    });

    filters.length === 0 ? router.push(pathName) : router.push(`${pathName}?${updatedParams.toString()}`);
    toggleFilterIsOpen();
  };

  const handleFilterChange = (filter: FilterOption) => {
    const exists = activeFilters.some((f) => f.type === filter.type && f.value === filter.value);
    exists ? removeFilter(filter) : addFilter(filter);
  };

  const handleClearFilters = () => {
    clearFilters();
  };

  return {
    activeFilters,
    filterIsOpen,
    handleApplyFilter,
    handleFilterChange,
    handleClearFilters,
    toggleFilterIsOpen,
  };
};
