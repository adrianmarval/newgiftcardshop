import { getSellerBatches } from '@/actions/seller/get-batches';
import { SellerBatchesView } from '@/components/sell/giftcard-batches';
import { sellerBatchesSearchParamsCache } from '@/lib/search-params-cache';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Cards History | Solmaira Cards',
  description: 'View and track your gift card batches, sales, and payments.',
};

export default async function SellerCardsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = sellerBatchesSearchParamsCache.parse(params);

  const { page, status, sort } = parsed;
  const search = parsed.search || undefined;

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
