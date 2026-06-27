'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdminLogsFilters } from './admin-logs-filters';
import { AdminLogsList } from './admin-logs-list';
import type { AppLogItem } from './admin-logs-list';
import type { PaginationMeta } from '@/types';

interface AdminLogsViewProps {
  logs: AppLogItem[];
  pagination: PaginationMeta;
  users: Array<{ id: string; name: string; email: string }>;
}

export const AdminLogsView = ({ logs, pagination, users }: AdminLogsViewProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Logs de Aplicación</CardTitle>
        <CardDescription>Registros de actividad del sistema, bots y operaciones de usuarios.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AdminLogsFilters users={users} />
        <AdminLogsList logs={logs} totalPages={pagination.totalPages} totalCount={pagination.totalCount} />
      </CardContent>
    </Card>
  );
};
