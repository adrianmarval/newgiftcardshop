import { Metadata } from 'next';
import { listBatches } from '@/actions/admin/batches';
import { getSellers } from '@/actions/admin/users/get-sellers';
import { AdminBatchesView } from '@/components/admin/batches/admin-batches-view';
import { adminBatchesSearchParamsCache } from '@/lib/search-params-cache';

export const metadata: Metadata = {
  title: `Admin Batches | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: 'Manage gift card batches, process payments and view seller activity',
};

export default async function AdminBatchesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = adminBatchesSearchParamsCache.parse(params);

  const { page, limit, sort, status } = parsed;
  const search = parsed.search || undefined;
  const sellerId = parsed.sellerId || null;
  const dateFrom = parsed.dateFrom || null;
  const dateTo = parsed.dateTo || null;
  const amountMin = parsed.amountMin ? Number(parsed.amountMin) : null;
  const amountMax = parsed.amountMax ? Number(parsed.amountMax) : null;

  const [batchesResult, sellersResult] = await Promise.all([
    listBatches({ page, limit, search, sort, sellerId, status, dateFrom, dateTo, amountMin, amountMax }),
    getSellers(),
  ]);

  if (!batchesResult.data?.success) {
    throw new Error('Failed to load batches');
  }

  const sellers = sellersResult.data?.success ? sellersResult.data.sellers : [];

  return <AdminBatchesView batches={batchesResult.data.items} sellers={sellers} pagination={batchesResult.data.pagination} />;
}
