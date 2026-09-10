'use client';

import { useState } from 'react';
import { useQueryStates } from 'nuqs';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {FiltersBar} from '@/components/common';
import { UserBadge } from '@/components/admin/user-badge';
import { UrlPagination } from '@/components/ui/url-pagination';
import { adminUsersSearchParamsParsers, buildAdminUsersInput } from '@/lib/search-params';
import { useListQuery } from '@/hooks/use-list-query';
import { apiQuery } from '@/lib/utils';
import { UserEditDialog } from './user-edit-dialog';
import { UnlinkTelegramDialog } from './unlink-telegram-dialog';
import type { User, PaginationMeta } from '@/types';

type AdminUsersInput = ReturnType<typeof buildAdminUsersInput>;
type AdminUsersData = { success: true; items: User[]; pagination: PaginationMeta };

async function fetchAdminUsers(input: AdminUsersInput) {
  return apiQuery<AdminUsersData>('admin-users', input);
}

interface UsersManagerProps {
  initialUsers: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
  /** Input exacto que usó el server page (para que el initialData aplique solo al primer paint). */
  initialInput: AdminUsersInput;
}

export function UsersManager({ initialUsers, pagination, initialInput }: UsersManagerProps) {
  const queryClient = useQueryClient();
  const [params] = useQueryStates(adminUsersSearchParamsParsers);
  const input = buildAdminUsersInput(params);

  const { data } = useListQuery({
    queryKey: 'admin-users',
    input,
    fetcher: fetchAdminUsers,
    initialInput,
    initialData: { success: true as const, items: initialUsers, pagination },
  });

  const users = data.items;
  const paginationMeta = data.pagination;

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  const [editUser, setEditUser] = useState<User | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<User | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <FiltersBar
        parsers={adminUsersSearchParamsParsers}
        defaults={{ search: '', role: 'ALL', isActive: 'ALL' }}
        config={{
          search: { placeholder: 'Buscar por nombre o email...', paramKey: 'search' },
          status: {
            label: 'Rol',
            paramKey: 'role',
            options: [
              { value: 'ALL', label: 'Todos' },
              { value: 'ADMIN', label: 'Admin' },
              { value: 'SELLER', label: 'Seller' },
              { value: 'BUYER', label: 'Buyer' },
            ],
          },
          selects: [
            {
              label: 'Estado',
              paramKey: 'isActive',
              options: [
                { value: 'ALL', label: 'Todos' },
                { value: 'true', label: 'Activo' },
                { value: 'false', label: 'Inactivo' },
              ],
            },
          ],
        }}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto custom-scrollbar">
        {users.map((user) => (
          <Card
            key={user.id}
            onClick={() => setEditUser(user)}
            className="hover:border-primary/30 cursor-pointer overflow-visible transition-all duration-200 ease-out"
          >
            <CardContent className="flex items-center gap-3 py-3">
              <UserBadge
                user={user}
                size="md"
                className="min-w-0 flex-1"
                nameExtra={
                  !user.isActive && (
                    <Badge variant="destructive" className="shrink-0 text-xs">
                      Inactivo
                    </Badge>
                  )
                }
              />
              <Badge variant="outline" className="shrink-0">
                {user.role}
              </Badge>
            </CardContent>
          </Card>
        ))}

        {users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">No se encontraron usuarios.</p>
          </div>
        )}
      </div>

      <div className="shrink-0">
        <UrlPagination totalPages={paginationMeta.totalPages} />
      </div>

      <UserEditDialog
        user={editUser}
        onClose={() => setEditUser(null)}
        onChanged={invalidateUsers}
        onUnlinkRequest={setUnlinkTarget}
      />

      <UnlinkTelegramDialog user={unlinkTarget} onClose={() => setUnlinkTarget(null)} onChanged={invalidateUsers} />
    </div>
  );
}
