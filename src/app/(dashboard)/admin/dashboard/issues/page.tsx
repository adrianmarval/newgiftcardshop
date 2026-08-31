import { Metadata } from 'next';
import { listIssues } from '@/actions/admin/issues';
import { getUsersByRole } from '@/actions/admin/users';
import { AdminIssuesView } from '@/components/admin/issues';
import { adminIssuesSearchParamsCache } from '@/lib/search-params';

export const metadata: Metadata = {
  title: `Problemas | Admin | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: 'Revisa los problemas reportados en tarjetas de regalo y comprobantes de compradores',
};

export default async function AdminIssuesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = adminIssuesSearchParamsCache.parse(params);

  const { page, limit, sort, issueType } = parsed;
  const search = parsed.search || undefined;
  const sellerId = parsed.sellerId || null;
  const buyerId = parsed.buyerId && parsed.buyerId !== 'ALL' ? parsed.buyerId : null;
  const dateFrom = parsed.dateFrom || null;
  const dateTo = parsed.dateTo || null;

  const [issuesResult, sellersResult, buyersResult] = await Promise.all([
    listIssues({ page, limit, search, sort, issueType, sellerId, buyerId, dateFrom, dateTo }),
    getUsersByRole({ role: 'SELLER' }),
    getUsersByRole({ role: 'BUYER' }),
  ]);

  if (!issuesResult.data?.success) {
    throw new Error('Failed to load issues');
  }

  const sellers = sellersResult.data?.success ? sellersResult.data.users : [];
  const buyers = buyersResult.data?.success ? buyersResult.data.users : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Problemas</h1>
      <AdminIssuesView issues={issuesResult.data.items} sellers={sellers} buyers={buyers} pagination={issuesResult.data.pagination} />
    </div>
  );
}
