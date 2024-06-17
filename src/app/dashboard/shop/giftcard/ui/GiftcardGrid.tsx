import { GiftcardOffer } from '@/interfaces/giftcard-interface';
import { IoFilterOutline, IoRefreshOutline } from 'react-icons/io5';
import { GiftcardItem } from './GiftcardItem';
import { UpdateOffersButton } from './UpdateOffersButton';

interface Props {
  offers: GiftcardOffer[];
}

export const GiftcardGrid = ({ offers }: Props) => {
  return (
    <div className="mb-6 rounded-lg bg-white px-2 py-2 shadow">
      <div className="mb-4 flex items-center justify-between text-sm">
        <UpdateOffersButton />
        <div className="flex items-center">
          <IoFilterOutline size={20} className="mr-2" />
        </div>
      </div>
      {offers.length === 0 && (
        <h1 className="flex items-center justify-center py-20 text-sm font-extrabold tracking-widest text-slate-600 sm:text-2xl">
          No se encontraron ofertas disponibles
        </h1>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
        {offers.map((offer) => (
          <GiftcardItem key={offer._id} offer={offer} />
        ))}
      </div>
    </div>
  );
};
