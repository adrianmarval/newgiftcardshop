import { Metadata } from 'next';
import { listPayments, getSellers, getBuyers, getAdmins } from '@/actions';
import { AdminPaymentsView } from '@/components/admin/payments/admin-payments-view';
import { adminPaymentsSearchParamsCache } from '@/lib/search-params-cache';

export const metadata: Metadata = {
  title: `Admin Payments | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: 'Payment history and management for admin',
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = adminPaymentsSearchParamsCache.parse(params);

  const { page, limit } = parsed;
  const direction = parsed.direction === 'ALL' ? undefined : parsed.direction;
  const category = parsed.category === 'ALL' ? undefined : parsed.category;
  const userId = parsed.userId || null;
  const search = parsed.search || undefined;
  const dateFrom = parsed.dateFrom || null;
  const dateTo = parsed.dateTo || null;

  const [paymentsResult, sellersResult, buyersResult, adminsResult] = await Promise.all([
    listPayments({ page, limit, direction, category, userId, search, dateFrom, dateTo }),
    getSellers(),
    getBuyers(),
    getAdmins(),
  ]);

  if (!paymentsResult.data?.success) {
    throw new Error('Failed to load payments');
  }

  const sellers = sellersResult.data?.success ? sellersResult.data.sellers : [];
  const buyers = buyersResult.data?.success ? buyersResult.data.buyers : [];
  const admins = adminsResult.data?.success ? adminsResult.data.admins : [];

  return (
    <div className="w-full space-y-4">
      <h1 className="flex justify-center text-4xl font-black tracking-tighter italic md:text-5xl">HISTORIAL DE PAGOS</h1>
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
