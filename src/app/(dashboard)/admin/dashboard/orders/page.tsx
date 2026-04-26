import { Metadata } from 'next';
import { adminOrders } from '@/actions/admin/admin-orders-list';
import { adminGetBuyers } from '@/actions/admin/admin-get-buyers';
import { AdminOrdersView } from '@/components/admin/orders';
import { adminOrdersSearchParamsParsers } from '@/components/admin/orders/admin-orders-search-params';
import { createSearchParamsCache } from 'nuqs/server';

const searchParamsCache = createSearchParamsCache(adminOrdersSearchParamsParsers);

export const metadata: Metadata = {
  title: 'Admin Orders | Solmaira Cards',
  description: 'Manage all buyer orders, process reports and handle cancellations',
};

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = searchParamsCache.parse(params);

  const page = parsed.page ?? 1;
  const limit = parsed.limit ?? 10;
  const search = parsed.search || undefined;
  const status = parsed.status === 'ALL' ? undefined : parsed.status;
  const buyerId = parsed.buyerId || null;
  const dateFrom = parsed.dateFrom || null;
  const dateTo = parsed.dateTo || null;

  const [ordersResult, buyersResult] = await Promise.all([
    adminOrders({ page, limit, search, status, buyerId, dateFrom, dateTo }),
    adminGetBuyers(),
  ]);

  if (!ordersResult.data?.success) {
    throw new Error('Failed to load orders');
  }

  const buyers = buyersResult.data?.success ? buyersResult.data.buyers : [];

  return (
    <div className="container mx-auto space-y-4 py-2">
      <h1 className="flex justify-center text-4xl font-black tracking-tighter italic md:text-7xl">ADMIN ÓRDENES</h1>
      <AdminOrdersView orders={ordersResult.data.items} buyers={buyers} pagination={ordersResult.data.pagination} />
    </div>
  );
}
