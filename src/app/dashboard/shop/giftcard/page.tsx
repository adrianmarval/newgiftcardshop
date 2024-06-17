import { getGiftcardOffers } from '@/actions/offer/get-giftcards-offers';
import { GiftcardGrid } from './ui/GiftcardGrid';
import { FilterBar } from '@/components/filter';
import { GiftcardParamsFilters } from '@/interfaces/filter-interface';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Props {
  searchParams: GiftcardParamsFilters;
}

const page = async ({ searchParams }: Props) => {
  const { country, brand } = searchParams;

  const giftCardOffers = await getGiftcardOffers({ country, brand });

  return (
    <div>
      <FilterBar />
      <GiftcardGrid offers={giftCardOffers} />
    </div>
  );
};

export default page;
