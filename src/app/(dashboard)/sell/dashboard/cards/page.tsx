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

  if (!result.data?.success) return <p>No batches found</p>;

  const { items, pagination } = result.data;

  return (
    <div className="container mx-auto space-y-4 py-2">
      <div className="flex flex-col gap-1">
        <h1 className="text-5xl font-black tracking-tighter italic md:text-7xl">MY CARDS</h1>
        <p className="text-muted-foreground text-base md:text-lg">Track your inventory, sales status, and payment reports.</p>
      </div>

      <SellerBatchesView batches={items} pagination={pagination} />
    </div>
  );
}
