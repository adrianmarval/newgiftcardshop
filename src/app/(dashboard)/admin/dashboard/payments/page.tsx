import { Metadata } from 'next';
import { listPayments } from '@/actions/admin/payments/list-payments';
import { getUsersByRole } from '@/actions/admin/users';
import { AdminPaymentsView } from '@/components/admin/payments/admin-payments-view';
import { adminPaymentsSearchParamsCache, buildAdminPaymentsInput } from '@/lib/search-params';

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
  const input = buildAdminPaymentsInput(parsed);

  const [paymentsResult, sellersResult, buyersResult, adminsResult] = await Promise.all([
    listPayments(input),
    getUsersByRole({ role: 'SELLER' }),
    getUsersByRole({ role: 'BUYER' }),
    getUsersByRole({ role: 'ADMIN' }),
  ]);

  if (!paymentsResult.data?.success) {
    throw new Error('Failed to load payments');
  }

  const sellers = sellersResult.data?.success ? sellersResult.data.users : [];
  const buyers = buyersResult.data?.success ? buyersResult.data.users : [];
  const admins = adminsResult.data?.success ? adminsResult.data.users : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Payments</h1>
      <AdminPaymentsView
        payments={paymentsResult.data.items}
        pagination={paymentsResult.data.pagination}
        sellers={sellers}
        buyers={buyers}
        admins={admins}
        initialInput={input}
      />
    </div>
  );
}
