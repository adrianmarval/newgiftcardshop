import { GiftcardOffer } from "../interfaces/giftcard-offer";

interface Props {
  offers: GiftcardOffer[];
}

export const OffersGrid = ({ offers = [] }: Props) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {offers.map((offer) => (
        <div key={offer.orderId}>{JSON.stringify(offer)}</div>
      ))}
    </div>
  );
};
