import { OffersGrid, FilterBar } from '@/offers/giftcards/components';
import { shopCategories } from '@/types';

const page = async () => {
  return (
    <div>
      <FilterBar />
      <OffersGrid />
    </div>
  );
};

export default page;
