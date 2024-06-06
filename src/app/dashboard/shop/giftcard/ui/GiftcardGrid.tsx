import { OfferCard } from '@/offers/giftcards/components';
import { GiftcardOffer } from '@/offers/giftcards/interfaces/offer-interface';
import { IoFilterOutline, IoRefreshOutline } from 'react-icons/io5';

interface Props {
  offers: GiftcardOffer[];
}

export const GiftcardGrid = ({ offers }: Props) => {
  return (
    <div className="mx-4 mb-6 rounded-lg bg-white px-4 py-2 shadow">
      <div className="mb-4 flex items-center justify-between text-sm">
        <button className="mb-1 flex items-center justify-center rounded-lg p-1 text-lg">
          <IoRefreshOutline size={20} />
          Actualizar
        </button>

        <div className="flex items-center">
          <IoFilterOutline size={20} className="mr-2" />
        </div>
      </div>
      {offers.length === 0 && (
        <h1 className="flex items-center justify-center py-20 text-2xl">{`No se encontraron ofertas disponibles`}</h1>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
        {offers.map((offer) => (
          <OfferCard key={offer.offerId} offer={offer} />
        ))}
      </div>
    </div>
  );
};
