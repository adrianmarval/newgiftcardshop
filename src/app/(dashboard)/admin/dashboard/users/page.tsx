import { Metadata } from 'next';
import { listUsers } from '@/actions/admin/users/';
import { UsersManager } from '@/components/admin/users/users-manager';
import { adminUsersSearchParamsCache, buildAdminUsersInput } from '@/lib/search-params';

export const metadata: Metadata = {
  title: 'Usuarios | Panel de Administración',
  description: 'Gestionar usuarios del sistema',
};

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = adminUsersSearchParamsCache.parse(params);
  const input = buildAdminUsersInput(parsed);

  const result = await listUsers(input);

  if (!result.data?.success) {
    throw new Error('Failed to load users');
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Users</h1>
      <UsersManager initialUsers={result.data.items} pagination={result.data.pagination} initialInput={input} />
    </div>
  );
}
