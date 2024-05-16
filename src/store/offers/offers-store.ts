import { GiftcardOffer } from "@/offers/interfaces/giftcard-offer";
import { FilterOption } from "@/types";
import { MultiValue } from "react-select";
import { create } from "zustand";

interface FilterProps {
  selectedOptions: MultiValue<unknown>;
  offers: GiftcardOffer[];
}

interface OffersStore {
  offersToDisplay: GiftcardOffer[];
  setOffersToDisplay: (offerts: GiftcardOffer[]) => void;
  filterOffers: (filter: FilterProps) => void;
}

export const offersStore = create<OffersStore>()((set) => ({
  offersToDisplay: [],
  setOffersToDisplay: (filteredOffers) =>
    set({ offersToDisplay: filteredOffers }),
  filterOffers: ({ offers, selectedOptions }) =>
    set((state) => {
      const filteredoffers = offers.filter((offer) => {
        const countryOptions = selectedOptions.filter(
          (option) => (option as FilterOption).type === "countryCode",
        );
        const cardNameOptions = selectedOptions.filter(
          (option) => (option as FilterOption).type === "storeName",
        );

        const matchesCountry =
          countryOptions.length === 0 ||
          countryOptions.some(
            (option) => offer.countryCode === (option as FilterOption).value,
          );

        const matchesCardName =
          cardNameOptions.length === 0 ||
          cardNameOptions.some(
            (option) => offer.storeName === (option as FilterOption).value,
          );

        return matchesCountry && matchesCardName;
      });

      console.log(filteredoffers);
      return {
        ...state,
        offersToDisplay: filteredoffers,
      };
    }),
}));
