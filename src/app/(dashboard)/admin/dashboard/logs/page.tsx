import { Metadata } from 'next';
import { listLogs } from '@/actions/admin/logs';
import { getLogUsers } from '@/actions/admin/logs';
import { AdminLogsView } from '@/components/admin/logs';
import { adminLogsSearchParamsCache, buildAdminLogsInput } from '@/lib/search-params';

export const metadata: Metadata = {
  title: `Admin Logs | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: 'View application logs, system events and user activity',
};

export default async function AdminLogsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = adminLogsSearchParamsCache.parse(params);
  const input = buildAdminLogsInput(parsed);

  const [logsResult, usersResult] = await Promise.all([
    listLogs(input),
    getLogUsers(),
  ]);

  if (!logsResult.data?.success) {
    throw new Error('Failed to load logs');
  }

  const users = usersResult.data?.success ? usersResult.data.users : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Logs</h1>
      <AdminLogsView logs={logsResult.data.items} pagination={logsResult.data.pagination} users={users} initialInput={input} />
    </div>
  );
}
