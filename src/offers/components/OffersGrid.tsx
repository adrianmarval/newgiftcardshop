"use client";
import { offersStore } from "@/store/offers/offers-store";
import { GiftcardOffer } from "../interfaces/giftcard-offer";
import { OfferCard } from "./OfferCard";
import { useEffect } from "react";
import { OrderFilter } from "./OrderFilter";

interface Props {
  offers: GiftcardOffer[];
}

export const OffersGrid = ({ offers = [] }: Props) => {
  const { setOffersToDisplay, offersToDisplay } = offersStore((state) => state);

  useEffect(() => {
    setOffersToDisplay(offers);
  }, []);

  return (
    <>
      <OrderFilter offers={offers} />
      <span className="mx-4 mb-6 flex items-center justify-center rounded-lg bg-white p-4 text-2xl font-extralight shadow ">
        {`Se han encontrado ${offersToDisplay.length} Ofertas Disponibles`}
      </span>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 ">
        {offersToDisplay.map((offer) => (
          <OfferCard key={offer.offerId} offer={offer} />
        ))}
      </div>
    </>
  );
};
