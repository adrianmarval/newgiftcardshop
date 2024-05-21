"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Select, { MultiValue } from "react-select";
import makeAnimated from "react-select/animated";
import { ReactSelectFilter } from "@/types";
import { useRouter } from "next/navigation";

const animatedComponents = makeAnimated();

const filterOptions: ReactSelectFilter[] = [
  { value: "amazon", label: "Amazon", type: "storeName" },
  { value: "apple", label: "Apple", type: "storeName" },
  { value: "us", label: "US 🇺🇸", type: "countryCode" },
  { value: "ca", label: "CA 🇨🇦", type: "countryCode" },
  { value: "uk", label: "UK 🇬🇧", type: "countryCode" },
];

export const OffersFilter = () => {
  const router = useRouter();
  const [selectedFilters, setSelectedFilters] = useState<ReactSelectFilter[]>(
    [],
  );

  const setFilter = useCallback(
    (appliedFilters: MultiValue<any>) => {
      const filters = appliedFilters as ReactSelectFilter[];

      // Solo permitir una selección de cada tipo
      const uniqueFilters = filters.reduce(
        (acc: ReactSelectFilter[], current) => {
          const exists = acc.find((filter) => filter.type === current.type);
          if (!exists) {
            acc.push(current);
          } else {
            // Reemplaza la selección existente si ya hay una del mismo tipo
            acc = acc.map((filter) =>
              filter.type === current.type ? current : filter,
            );
          }
          return acc;
        },
        [],
      );

      setSelectedFilters(uniqueFilters);
      localStorage.setItem("selectedFilters", JSON.stringify(uniqueFilters));

      if (uniqueFilters.length > 0) {
        const queryParams = uniqueFilters
          .map((filter) => `${filter.type}=${filter.value}`)
          .join("&");
        router.push(`/dashboard/buy?${queryParams}`);
      } else {
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

  // Filtrar las opciones disponibles según las selecciones actuales
  const availableOptions = filterOptions.filter((option) => {
    const selectedTypes = selectedFilters.map((filter) => filter.type);
    return (
      !selectedTypes.includes(option.type) ||
      selectedFilters.some((filter) => filter.value === option.value)
    );
  });

  return (
    <div className="mx-4 mb-4 flex items-center justify-center rounded-lg bg-white p-4 shadow">
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
          placeholder="Filtrar Ordenes"
          closeMenuOnSelect={true}
          components={animatedComponents}
          options={availableOptions}
          value={selectedFilters}
          isMulti
          onChange={setFilter}
        />
      </div>
    </div>
  );
};
