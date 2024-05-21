import { useCallback } from "react";
import { MultiValue } from "react-select";
import { ReactSelectFilter } from "@/types";
import { useRouter } from "next/navigation";
import { offersStore } from "@/store/offers/offers-store";

export const useOffersFilters = () => {
  const router = useRouter();
  const { offersFilters, setOffersFilters } = offersStore((state) => state);

  const handleFilterChange = useCallback(
    (appliedFilters: MultiValue<any>) => {
      const newFilters = appliedFilters as ReactSelectFilter[];

      // Obtener los filtros únicos, permitiendo solo una selección de cada tipo
      const uniqueFilters = getUniqueFilters(newFilters);

      setOffersFilters(uniqueFilters);

      if (uniqueFilters.length > 0) {
        const queryParams = uniqueFilters
          .map((filter) => `${filter.type}=${filter.value}`)
          .join("&");
        router.push(`/dashboard/buy?${queryParams}`);
      } else {
        router.push("/dashboard/buy");
      }
    },
    [router, setOffersFilters],
  );

  const getAvailableOptions = (filterOptions: ReactSelectFilter[]) =>
    filterOptions.filter((option) => {
      const selectedTypes = offersFilters.map((filter) => filter.type);
      return (
        !selectedTypes.includes(option.type) ||
        offersFilters.some((filter) => filter.value === option.value)
      );
    });

  return { offersFilters, handleFilterChange, getAvailableOptions };
};

const getUniqueFilters = (
  filters: ReactSelectFilter[],
): ReactSelectFilter[] => {
  const uniqueFilters: ReactSelectFilter[] = [];

  for (const filter of filters) {
    const existingFilterIndex = uniqueFilters.findIndex(
      (f) => f.type === filter.type,
    );

    if (existingFilterIndex === -1) {
      uniqueFilters.push(filter);
    } else {
      uniqueFilters[existingFilterIndex] = filter;
    }
  }

  return uniqueFilters;
};
