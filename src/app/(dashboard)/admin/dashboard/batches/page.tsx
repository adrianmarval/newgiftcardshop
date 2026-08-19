import { Metadata } from 'next';
import { listBatches } from '@/actions/admin/batches';
import { getUsersByRole } from '@/actions/admin/users';
import { AdminBatchesView } from '@/components/admin/batches/admin-batches-view';
import { adminBatchesSearchParamsCache } from '@/lib/search-params';

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
    getUsersByRole({ role: 'SELLER' }),
  ]);

  if (!batchesResult.data?.success) {
    throw new Error('Failed to load batches');
  }

  const sellers = sellersResult.data?.success ? sellersResult.data.users : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Batches</h1>
      <AdminBatchesView batches={batchesResult.data.items} sellers={sellers} pagination={batchesResult.data.pagination} />
    </div>
  );
}
