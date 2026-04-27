import { Metadata } from 'next';
import { listUsers } from '@/actions/admin/users';
import { UsersManager } from './users-manager';
import { adminUsersSearchParamsParsers } from '@/components/admin/users/admin-users-search-params';
import { createSearchParamsCache } from 'nuqs/server';

const searchParamsCache = createSearchParamsCache(adminUsersSearchParamsParsers);

export const metadata: Metadata = {
  title: 'Usuarios | Panel de Administración',
  description: 'Gestionar usuarios del sistema',
};

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = searchParamsCache.parse(params);

  const page = parsed.page ?? 1;
  const limit = parsed.limit ?? 10;
  const search = parsed.search || undefined;
  const role = parsed.role === 'ALL' ? undefined : parsed.role;

  const result = await listUsers({ page, limit, search, role });

  if (!result.data?.success) {
    throw new Error('Failed to load users');
  }

  return (
    <UsersManager
      initialUsers={result.data.items}
      pagination={result.data.pagination}
      searchParams={{ search: parsed.search, role: parsed.role }}
    />
  );
}
