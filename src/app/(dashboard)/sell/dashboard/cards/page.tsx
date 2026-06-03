import { listBatches } from '@/actions/seller/batches';
import { SellerBatchesView } from '@/components/sell/giftcard-batches';
import { sellerBatchesSearchParamsCache } from '@/lib/search-params-cache';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: `My Cards History | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: 'View and track your gift card batches, sales, and payments.',
};

export default async function SellerCardsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = sellerBatchesSearchParamsCache.parse(params);

  const { page, status, sort } = parsed;
  const search = parsed.search || undefined;

  const result = await listBatches({ page, status, search, sort });

  if (!result.data?.success) throw new Error('An error occurred while loading the GiftCard Batches.');

  const { items, pagination } = result.data;

  return <SellerBatchesView batches={items} pagination={pagination} />;
}
