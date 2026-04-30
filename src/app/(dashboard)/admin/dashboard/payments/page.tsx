import { Metadata } from 'next';
import { adminPayments, adminGetSellers, adminGetBuyers, adminGetAdmins } from '@/actions';
import { AdminPaymentsView } from '@/components/admin/payments/admin-payments-view';
import { adminPaymentsSearchParamsParsers } from '@/types/domain/admin';
import { createSearchParamsCache } from 'nuqs/server';

const searchParamsCache = createSearchParamsCache(adminPaymentsSearchParamsParsers);

export const metadata: Metadata = {
  title: 'Admin Payments | Solmaira Cards',
  description: 'Payment history and management for admin',
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = searchParamsCache.parse(params);

  const page = parsed.page ?? 1;
  const limit = parsed.limit ?? 20;
  const direction = parsed.direction === 'ALL' ? undefined : parsed.direction;
  const category = parsed.category === 'ALL' ? undefined : parsed.category;
  const userId = parsed.userId || null;
  const search = parsed.search || undefined;
  const dateFrom = parsed.dateFrom || null;
  const dateTo = parsed.dateTo || null;

  const [paymentsResult, sellersResult, buyersResult, adminsResult] = await Promise.all([
    adminPayments({ page, limit, direction, category, userId, search, dateFrom, dateTo }),
    adminGetSellers(),
    adminGetBuyers(),
    adminGetAdmins(),
  ]);

  if (!paymentsResult.data?.success) {
    throw new Error('Failed to load payments');
  }

  const sellers = sellersResult.data?.success ? sellersResult.data.sellers : [];
  const buyers = buyersResult.data?.success ? buyersResult.data.buyers : [];
  const admins = adminsResult.data?.success ? adminsResult.data.admins : [];

  return (
    <div className="container mx-auto space-y-4 py-2">
      <h1 className="flex justify-center text-4xl font-black tracking-tighter italic md:text-7xl">HISTORIAL DE PAGOS</h1>
      <AdminPaymentsView
        payments={paymentsResult.data.items}
        pagination={paymentsResult.data.pagination}
        sellers={sellers}
        buyers={buyers}
        admins={admins}
      />
    </div>
  );
}
