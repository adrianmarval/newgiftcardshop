import { getSellerBatches } from '@/actions/seller/get-batches';
import { SellerBatchesView } from '@/components/sell/giftcard-batches';
import { sellerBatchesSearchParamsParsers } from '@/types/domain/seller';
import { createSearchParamsCache } from 'nuqs/server';
import { Metadata } from 'next';

const searchParamsCache = createSearchParamsCache(sellerBatchesSearchParamsParsers);

export const metadata: Metadata = {
  title: 'My Cards History | Solmaira Cards',
  description: 'View and track your gift card batches, sales, and payments.',
};

export default async function SellerCardsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = searchParamsCache.parse(params);

  const page = parsed.page ?? 1;
  const status = parsed.status ?? 'ALL';
  const search = parsed.search || undefined;
  const sort = parsed.sort ?? 'newest';

  const result = await getSellerBatches({ page, status, search, sort });

  if (!result.data?.success) throw new Error('An error occurred while loading the GiftCard Batches.');

  const { items, pagination } = result.data;

  return (
    <div className="container mx-auto space-y-4 py-2">
      <h1 className="flex justify-center text-4xl font-black tracking-tighter italic md:text-7xl">BATCHES HISTORY</h1>
      <SellerBatchesView batches={items} pagination={pagination} />
    </div>
  );
}
