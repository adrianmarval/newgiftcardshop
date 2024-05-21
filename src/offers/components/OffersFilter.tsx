"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Select, { MultiValue } from "react-select";
import makeAnimated from "react-select/animated";
import { ReactSelectFilter } from "@/types";
import { useRouter } from "next/navigation";
const animatedComponents = makeAnimated();

const filterOptions: ReactSelectFilter[] = [
  { value: "us", label: "US 🇺🇸", type: "countryCode" },
  { value: "ca", label: "CA 🇨🇦", type: "countryCode" },
  { value: "uk", label: "UK 🇬🇧", type: "countryCode" },
  { value: "amazon", label: "Amazon", type: "storeName" },
  { value: "apple", label: "Apple", type: "storeName" },
];

export const OffersFilter = () => {
  const router = useRouter();
  const [selectedFilters, setSelectedFilters] = useState<ReactSelectFilter[]>(
    [],
  );

  const setFilter = useCallback(
    (appliedFilters: MultiValue<any>) => {
      const filters = appliedFilters as ReactSelectFilter[];
      setSelectedFilters(filters);

      localStorage.setItem("selectedFilters", JSON.stringify(filters));

      if (filters.length > 0) {
        // Redirigir solo si hay filtros aplicados
        for (const filter of filters) {
          if (filter.type) {
            router.push(`?${filter.type}=${filter.value}`);
          }
        }
      } else {
        // Si no hay filtros, redirigir a /buy
        router.push("/dashboard/buy");
      }
    },
    [router],
  );

  useEffect(() => {
    const storedFilters = localStorage.getItem("selectedFilters");
    if (storedFilters) {
      const parsedFilters = JSON.parse(storedFilters) as ReactSelectFilter[];
      setSelectedFilters(parsedFilters);
      setFilter(parsedFilters);
    }
  }, [setFilter]);

  return (
    <div className="mx-4 mb-4 flex items-center justify-center rounded-lg bg-white p-4 shadow ">
      <div className="mx-auto w-full justify-center text-xs md:max-w-[550px] lg:text-lg">
        <Select
          instanceId={useId()}
          styles={{
            control: (provided, state) => ({
              ...provided,
              height: "50px",
              backgroundColor: "rgb(2 6 23 )",
              borderRadius: "1.5rem",
            }),
            option: (provided, state) => ({
              ...provided,
            }),
            multiValue: (provided, state) => ({
              ...provided,
              borderRadius: "1.5rem",
              width: "auto",
              padding: "4px",
            }),
            multiValueRemove: (provided, state) => ({
              ...provided,
              borderRadius: "9999px",
              ":hover": { backgroundColor: "gray" },
            }),
          }}
          placeholder="Filtrar Ordenes
          "
          closeMenuOnSelect={true}
          components={animatedComponents}
          options={filterOptions}
          value={selectedFilters}
          isMulti
          onChange={setFilter}
        />
      </div>
    </div>
  );
};
