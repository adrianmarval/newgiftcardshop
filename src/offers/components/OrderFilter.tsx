"use client";

import { offersStore } from "@/store/offers/offers-store";
import { useId } from "react";
import Select from "react-select";
import makeAnimated from "react-select/animated";
import { GiftcardOffer } from "../interfaces/giftcard-offer";
import { FilterOption } from "@/types";
const animatedComponents = makeAnimated();

const filterOptions: FilterOption[] = [
  { value: "us", label: "US 🇺🇸", type: "countryCode" },
  { value: "ca", label: "CA 🇨🇦", type: "countryCode" },
  { value: "uk", label: "UK 🇬🇧", type: "countryCode" },
  { value: "amazon", label: "Amazon", type: "storeName" },
  { value: "apple", label: "Apple", type: "storeName" },
];

interface Props {
  offers: GiftcardOffer[];
}

export const OrderFilter = ({ offers }: Props) => {
  const { filterOffers } = offersStore((state) => state);

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
          isMulti
          options={filterOptions}
          onChange={(event) =>
            filterOffers({ selectedOptions: event, offers: offers })
          }
        />
      </div>
    </div>
  );
};
