'use client';
import { useEffect, useState } from 'react';
import { OfferCard } from './OfferCard';
import { SortDropdown } from './SortDropdown';
import { IoFilterOutline, IoRefreshOutline } from 'react-icons/io5';
import { Spinner } from '@/components';
import { useGiftcardsOffers } from '@/hooks/useGiftcardsOffers';
import { useFilterOffers } from '@/hooks/useOfferFilter';

export const OffersGrid = () => {
  const { offers, isLoading, getOffers } = useGiftcardsOffers();
  const { activeFilters } = useFilterOffers();
  const [sortOption, setSortOption] = useState('recent'); // Estado para el ordenamiento

  useEffect(() => {
    getOffers(activeFilters);
  }, []);

  const sortedOffers = offers.sort((a, b) => {
    if (sortOption === 'totalAmount_asc') return a.totalAmount - b.totalAmount;
    if (sortOption === 'totalAmount_desc') return b.totalAmount - a.totalAmount;
    return 0;
  });

  return (
    <div className="mx-4 mb-6 rounded-lg bg-white px-4 py-2 shadow">
      <div className="mb-4 flex items-center justify-between text-sm">
        <button onClick={() => getOffers(activeFilters)} className="mb-1 flex items-center justify-center rounded-lg p-1 text-lg">
          <IoRefreshOutline size={20} />
          Actualizar
        </button>

        <div className="flex items-center">
          <IoFilterOutline size={20} className="mr-2" />
          <SortDropdown onSortChange={setSortOption} />{' '}
        </div>
      </div>
      {offers.length === 0 && !isLoading && (
        <h1 className="flex items-center justify-center py-20 text-2xl">{`No se encontraron ofertas disponibles`}</h1>
      )}

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          {sortedOffers.map((offer) => (
            <OfferCard key={offer.offerId} offer={offer} />
          ))}
        </div>
      )}
    </div>
  );
};
