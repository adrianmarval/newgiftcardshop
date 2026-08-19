import { Metadata } from 'next';
import { listLogs } from '@/actions/admin/logs';
import { getLogUsers } from '@/actions/admin/logs';
import { AdminLogsView } from '@/components/admin/logs';
import { adminLogsSearchParamsCache } from '@/lib/search-params';

export const metadata: Metadata = {
  title: `Admin Logs | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: 'View application logs, system events and user activity',
};

export default async function AdminLogsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = adminLogsSearchParamsCache.parse(params);

  const { page, limit } = parsed;
  const search = parsed.search || undefined;
  const level = parsed.level === 'ALL' ? undefined : parsed.level;
  const source = parsed.source === 'ALL' ? undefined : parsed.source;
  const flow = parsed.flow === 'ALL' ? undefined : parsed.flow;
  const userId = parsed.userId || null;
  const dateFrom = parsed.dateFrom || null;
  const dateTo = parsed.dateTo || null;

  const [logsResult, usersResult] = await Promise.all([
    listLogs({ page, limit, search, level, source, flow, userId, dateFrom, dateTo }),
    getLogUsers(),
  ]);

  if (!logsResult.data?.success) {
    throw new Error('Failed to load logs');
  }

  const users = usersResult.data?.success ? usersResult.data.users : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Logs</h1>
      <AdminLogsView logs={logsResult.data.items} pagination={logsResult.data.pagination} users={users} />
    </div>
  );
}
