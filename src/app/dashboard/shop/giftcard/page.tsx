import { getGiftcardOffers } from '@/actions/offer/get-giftcards-offers';
import { GiftcardGrid } from './ui/GiftcardGrid';
import { FilterBar } from '@/components/filter';
import { ParamsFilters } from '@/interfaces/filter-interface';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Props {
  searchParams: ParamsFilters;
}

const page = async ({ searchParams }: Props) => {
  // Formatea searchParams para poder pasarlo a la funcion getGiftcardOffers en el formato que espera
  const giftCardFilters = Object.fromEntries(
    Object.entries(searchParams).map(([category, value]) => [category, Array.isArray(value) ? value : [value].filter(Boolean)]),
  );

  const giftCardOffers = await getGiftcardOffers(giftCardFilters as { [category: string]: string[] });

  return (
    <div>
      <FilterBar />
      <GiftcardGrid offers={giftCardOffers} />
    </div>
  );
};

export default page;
