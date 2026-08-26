import { Metadata } from 'next';
import { listUsers } from '@/actions/admin/users/';
import { UsersManager } from '@/components/admin/users/users-manager';
import { adminUsersSearchParamsCache } from '@/lib/search-params';

export const metadata: Metadata = {
  title: 'Usuarios | Panel de Administración',
  description: 'Gestionar usuarios del sistema',
};

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = adminUsersSearchParamsCache.parse(params);

  const { page, limit } = parsed;
  const search = parsed.search || undefined;
  const role = parsed.role === 'ALL' ? undefined : parsed.role;
  const isActive = parsed.isActive === 'ALL' ? undefined : parsed.isActive === 'true';

  const result = await listUsers({ page, limit, search, role, isActive });

  if (!result.data?.success) {
    throw new Error('Failed to load users');
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Users</h1>
      <UsersManager initialUsers={result.data.items} pagination={result.data.pagination} />
    </div>
  );
}
