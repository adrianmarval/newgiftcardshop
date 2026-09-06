import { Metadata } from 'next';
import { listBatches } from '@/actions/admin/batches';
import { AdminBatchesView } from '@/components/admin/batches/admin-batches-view';
import { adminBatchesSearchParamsCache, buildAdminBatchesInput } from '@/lib/search-params';

export const metadata: Metadata = {
  title: `Admin Batches | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: 'Manage gift card batches, process payments and view seller activity',
};

export default async function AdminBatchesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = adminBatchesSearchParamsCache.parse(params);
  const input = buildAdminBatchesInput(parsed);

  const batchesResult = await listBatches(input);

  if (!batchesResult.data?.success) {
    throw new Error('Failed to load batches');
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Batches</h1>
      <AdminBatchesView batches={batchesResult.data.items} pagination={batchesResult.data.pagination} initialInput={input} />
    </div>
  );
}
