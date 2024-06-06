import { getGiftcardOffers } from '@/actions/offer/get-giftcards-offers';
import { NewFilterBar } from '@/offers/giftcards/components';
import { GiftcardGrid } from './ui/GiftcardGrid';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Props {
  searchParams: { [key: string]: string | string[] | undefined };
}

const page = async ({ searchParams }: Props) => {
  console.log('construido');
  const filters: { [key: string]: string[] | undefined } = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.filter((v): v is string => v !== undefined) : value !== undefined ? [value] : undefined,
    ]),
  );

  const offers = await getGiftcardOffers(filters);

  return (
    <div>
      <NewFilterBar />
      <GiftcardGrid offers={offers} />
    </div>
  );
};

export default page;
