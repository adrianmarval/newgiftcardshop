import { Metadata } from 'next';
import { listOrders } from '@/actions/admin/orders';
import { AdminOrdersView } from '@/components/admin/orders';
import { adminOrdersSearchParamsCache, buildAdminOrdersInput } from '@/lib/search-params';

export const metadata: Metadata = {
  title: `Admin Orders | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: 'Manage all buyer orders, process reports and handle cancellations',
};

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = adminOrdersSearchParamsCache.parse(params);
  const input = buildAdminOrdersInput(parsed);

  const ordersResult = await listOrders(input);

  if (!ordersResult.data?.success) {
    throw new Error('Failed to load orders');
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Orders</h1>
      <AdminOrdersView orders={ordersResult.data.items} pagination={ordersResult.data.pagination} initialInput={input} />
    </div>
  );
}
