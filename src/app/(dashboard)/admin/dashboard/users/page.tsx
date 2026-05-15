import { Metadata } from 'next';
import { listUsers } from '@/actions/admin/users';
import { UsersManager } from './users-manager';
import { adminUsersSearchParamsCache } from '@/lib/search-params-cache';

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

  const result = await listUsers({ page, limit, search, role });

  if (!result.data?.success) {
    throw new Error('Failed to load users');
  }

  return (
    <div className="container mx-auto space-y-4 py-2">
      <h1 className="flex justify-center text-4xl font-black tracking-tighter italic md:text-7xl">USUARIOS</h1>
      <UsersManager
        initialUsers={result.data.items}
        pagination={result.data.pagination}
        searchParams={{ search: parsed.search, role: parsed.role }}
      />
    </div>
  );
}
