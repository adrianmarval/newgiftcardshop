import { Metadata } from 'next';
import { adminBatches } from '@/actions/admin/admin-batches';
import { adminGetSellers } from '@/actions/admin/admin-get-sellers';
import { AdminBatchesView } from '@/components/admin/batches/admin-batches-view';
import { adminBatchesSearchParamsParsers } from '@/types/domain/admin';
import { createSearchParamsCache } from 'nuqs/server';

const searchParamsCache = createSearchParamsCache(adminBatchesSearchParamsParsers);

export const metadata: Metadata = {
  title: 'Admin Batches | Solmaira Cards',
  description: 'Manage gift card batches, process payments and view seller activity',
};

export default async function AdminBatchesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = searchParamsCache.parse(params);

  const page = parsed.page ?? 1;
  const limit = parsed.limit ?? 10;
  const search = parsed.search || undefined;
  const sort = parsed.sort ?? 'newest';
  const sellerId = parsed.sellerId || null;
  const status = parsed.status ?? 'ALL';
  const dateFrom = parsed.dateFrom || null;
  const dateTo = parsed.dateTo || null;
  const amountMin = parsed.amountMin ? Number(parsed.amountMin) : null;
  const amountMax = parsed.amountMax ? Number(parsed.amountMax) : null;

  const [batchesResult, sellersResult] = await Promise.all([
    adminBatches({ page, limit, search, sort, sellerId, status, dateFrom, dateTo, amountMin, amountMax }),
    adminGetSellers(),
  ]);

  if (!batchesResult.data?.success) {
    throw new Error('Failed to load batches');
  }

  const sellers = sellersResult.data?.success ? sellersResult.data.sellers : [];

  return (
    <div className="container mx-auto space-y-4 py-2">
      <h1 className="flex justify-center text-4xl font-black tracking-tighter italic md:text-7xl">ADMIN BATCHES</h1>
      <AdminBatchesView batches={batchesResult.data.items} sellers={sellers} pagination={batchesResult.data.pagination} />
    </div>
  );
}
