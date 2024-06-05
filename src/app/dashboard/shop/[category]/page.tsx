import { OffersGrid, FilterBar } from '@/offers/giftcards/components';
import { shopCategories } from '@/types';

interface Props {
  params: { category: shopCategories };
}

const page = async ({ params }: Props) => {
  const { category } = params;

  return (
    <div>
      <FilterBar category={category} />
      <OffersGrid />
    </div>
  );
};

export default page;
