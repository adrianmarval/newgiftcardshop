import { useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { filterOptions } from '@/offers/giftcards/interfaces/filterTypes';
import { useFilterStore } from '@/store/offers/new-filter-store';
import { shopCategories } from '@/types';

export const useFilter = (category: shopCategories) => {
  const { activeFilters, filterIsOpen, setActiveFilters, addFilter, removeFilter, clearFilters, toggleFilterIsOpen } = useFilterStore();
  const pathName = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const storedFilters = localStorage.getItem('activeFilters');
    if (storedFilters) {
      setActiveFilters(JSON.parse(storedFilters));
    } else {
      const searchFilters = Object.fromEntries(searchParams);

      const initialFilters = Object.entries(searchFilters).flatMap(([type, value]) => {
        // Manejar múltiples valores en un filtro
        const values = Array.isArray(value) ? value : [value];
        return values.map((v) => {
          const option = filterOptions[category].find((opt) => opt.type === type)?.options.find((o) => o.value === v);
          return {
            type,
            value: v,
            label: option?.label || v,
          };
        });
      });

      setActiveFilters(initialFilters);
    }
  }, [searchParams, category, setActiveFilters]);

  const handleApplyFilter = () => {
    const searchFilters = Object.fromEntries(searchParams);
    const filters = activeFilters.map(({ type, value }) => ({
      type,
      value,
      label: filterOptions[category].find((opt) => opt.type === type)?.options.find((o) => o.value === value)?.label || value,
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
    localStorage.setItem('activeFilters', JSON.stringify(filters));
    toggleFilterIsOpen();
  };

  const handleFilterChange = (filter: { type: string; value: string; label: string }) => {
    const exists = activeFilters.some((f) => f.type === filter.type && f.value === filter.value);
    exists ? removeFilter(filter) : addFilter(filter);
    localStorage.setItem('activeFilters', JSON.stringify(activeFilters));
  };

  const handleClearFilters = () => {
    clearFilters();
    localStorage.setItem('activeFilters', JSON.stringify([]));
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
