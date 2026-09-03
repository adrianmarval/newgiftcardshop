'use client';

import { useQueryStates } from 'nuqs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { UrlPagination } from '@/components/ui/url-pagination';
import { AdminLogsFilters } from './admin-logs-filters';
import { AdminLogsList } from './admin-logs-list';
import { showAlert } from '@/lib/ui';
import { useAction } from 'next-safe-action/hooks';
import { purgeLogs, listLogs } from '@/actions/admin/logs';
import { adminLogsSearchParamsParsers, buildAdminLogsInput } from '@/lib/search-params';
import { useListQuery } from '@/hooks/use-list-query';
import { Trash2 } from 'lucide-react';
import type { AppLogItem } from '@/types';
import type { PaginationMeta } from '@/types';

type AdminLogsInput = ReturnType<typeof buildAdminLogsInput>;

async function fetchAdminLogs(input: AdminLogsInput) {
  const res = await listLogs(input);
  if (!res.data?.success) throw new Error('Failed to load logs');
  return res.data;
}

interface AdminLogsViewProps {
  logs: AppLogItem[];
  pagination: PaginationMeta;
  users: Array<{ id: string; name: string; email: string }>;
  /** Input exacto que usó el server page (para que el initialData aplique solo al primer paint). */
  initialInput: AdminLogsInput;
}

export const AdminLogsView = ({ logs, pagination, users, initialInput }: AdminLogsViewProps) => {
  const [params] = useQueryStates(adminLogsSearchParamsParsers);
  const input = buildAdminLogsInput(params);

  const { data } = useListQuery({
    queryKey: 'admin-logs',
    input,
    fetcher: fetchAdminLogs,
    initialInput,
    initialData: { success: true as const, items: logs, pagination },
  });
  const purgeAction = useAction(purgeLogs, {
    onSuccess: (result: { data?: { success?: boolean; deletedCount?: number } }) => {
      if (result.data?.success) {
        showAlert.toast.success(`${result.data.deletedCount} logs eliminados`);
      }
    },
    onError: () => {
      showAlert.toast.error('Error al purgar logs');
    },
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="shrink-0">
          <CardTitle>Logs de Aplicación</CardTitle>
          <CardDescription>Registros de actividad del sistema, bots y operaciones de usuarios.</CardDescription>
        </CardHeader>
        <div className="flex shrink-0 items-center justify-between px-6 pb-2">
          <AdminLogsFilters users={users} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Trash2 className="h-3.5 w-3.5" />
                Purgar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={async () => {
                  const confirmed = await showAlert.confirm('Purgar logs', 'Eliminar logs de los últimos 1 día. Esta acción no se puede deshacer.');
                  if (confirmed) purgeAction.execute({ olderThanDays: 1 });
                }}
              >
                Logs de hace +1 día
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  const confirmed = await showAlert.confirm('Purgar logs', 'Eliminar logs de hace +7 días. Esta acción no se puede deshacer.');
                  if (confirmed) purgeAction.execute({ olderThanDays: 7 });
                }}
              >
                Logs de hace +7 días
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  const confirmed = await showAlert.confirm('Purgar logs', 'Eliminar logs de hace +15 días. Esta acción no se puede deshacer.');
                  if (confirmed) purgeAction.execute({ olderThanDays: 15 });
                }}
              >
                Logs de hace +15 días
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  const confirmed = await showAlert.confirm('Purgar logs', 'Eliminar logs de hace +30 días. Esta acción no se puede deshacer.');
                  if (confirmed) purgeAction.execute({ olderThanDays: 30 });
                }}
              >
                Logs de hace +30 días
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={async () => {
                  const confirmed = await showAlert.confirm('Limpiar TODOS los logs', 'Esto eliminará TODOS los logs del sistema. Esta acción no se puede deshacer.');
                  if (confirmed) purgeAction.execute({ olderThanDays: 0 });
                }}
              >
                Limpiar todos los logs
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardContent className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
          <AdminLogsList logs={data.items} totalPages={data.pagination.totalPages} totalCount={data.pagination.totalCount} />
        </CardContent>
      </Card>
      <div className="shrink-0">
        <UrlPagination totalPages={data.pagination.totalPages} />
      </div>
    </div>
  );
};
