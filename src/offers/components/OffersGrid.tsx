import { GiftcardOffer } from "../interfaces/giftcard-offer";
import { OfferCard } from "./OfferCard";

interface Props {
  offers: GiftcardOffer[];
  searchParams: { countryCode: string | null; storeName: string | null };
}
const filterOffers = (
  offers: GiftcardOffer[],
  searchParams: Props["searchParams"],
) => {
  return offers.filter((offer) => {
    const countryMatch =
      !searchParams.countryCode ||
      offer.countryCode === searchParams.countryCode;
    const storeMatch =
      !searchParams.storeName || offer.storeName === searchParams.storeName;
    return countryMatch && storeMatch;
  });
};

export const OffersGrid = ({ offers = [], searchParams }: Props) => {
  const filteredOffers = filterOffers(offers, searchParams);

  return (
    <div className="mx-4 mb-6 flex items-center justify-center rounded-lg bg-white p-4 shadow">
      {filteredOffers.length === 0 && (
        <h1 className="flex items-center justify-center text-2xl">
          {`Actualmente no hay Ofertas en ${searchParams.countryCode?.toUpperCase()} para la tienda ${searchParams.storeName?.toUpperCase()}`}
        </h1>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
        {filteredOffers.map((offer) => (
          <OfferCard key={offer.offerId} offer={offer} />
        ))}
      </div>
    </div>
  );
};
