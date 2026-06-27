'use client';

import { useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { UrlPagination } from '@/components/ui/url-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AdminLogDetailDialog } from './admin-log-detail-dialog';
import { showAlert } from '@/lib/ui';
import { useAction } from 'next-safe-action/hooks';
import { purgeLogs } from '@/actions/admin/logs';

const LEVEL_CONFIG: Record<string, { label: string; className: string }> = {
  info: { label: 'INFO', className: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  warn: { label: 'WARN', className: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  error: { label: 'ERROR', className: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30' },
  debug: { label: 'DEBUG', className: 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30' },
};

const SOURCE_CONFIG: Record<string, { label: string; className: string }> = {
  web: { label: 'Web', className: 'bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30' },
  'seller-bot': { label: 'Seller Bot', className: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  'buyer-bot': { label: 'Buyer Bot', className: 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30' },
  cron: { label: 'Cron', className: 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30' },
  system: { label: 'Sistema', className: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30' },
};

const FLOW_CONFIG: Record<string, string> = {
  sell: 'Venta',
  buy: 'Compra',
  order: 'Orden',
  payment: 'Pago',
  batch: 'Lote',
  auth: 'Auth',
};

export interface AppLogItem {
  id: string;
  timestamp: string;
  level: string;
  source: string;
  flow: string | null;
  action: string | null;
  message: string;
  userId: string | null;
  userName: string | null;
  metadata: unknown;
  error: unknown;
  ip: string | null;
}

interface AdminLogsListProps {
  logs: AppLogItem[];
  totalPages: number;
  totalCount: number;
}

export const AdminLogsList = ({ logs, totalPages, totalCount }: AdminLogsListProps) => {
  const [selectedLog, setSelectedLog] = useState<AppLogItem | null>(null);

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

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="text-muted-foreground/20 h-12 w-12" />}
        title="No se encontraron logs"
        description="Intenta ajustar tus filtros o palabras clave de búsqueda."
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">{totalCount} logs encontrados</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <Trash2 className="h-3.5 w-3.5" />
              Purgar logs
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

      <div className="bg-card rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-muted-foreground px-3 py-3 text-left text-xs font-medium">Fecha</th>
                <th className="text-muted-foreground px-3 py-3 text-left text-xs font-medium">Nivel</th>
                <th className="text-muted-foreground px-3 py-3 text-left text-xs font-medium">Fuente</th>
                <th className="text-muted-foreground px-3 py-3 text-left text-xs font-medium">Flujo</th>
                <th className="text-muted-foreground px-3 py-3 text-left text-xs font-medium">Acción</th>
                <th className="text-muted-foreground px-3 py-3 text-left text-xs font-medium">Mensaje</th>
                <th className="text-muted-foreground px-3 py-3 text-left text-xs font-medium">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => {
                const levelConf = LEVEL_CONFIG[log.level] ?? LEVEL_CONFIG.info;
                const sourceConf = SOURCE_CONFIG[log.source] ?? SOURCE_CONFIG.system;

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="text-muted-foreground px-3 py-2.5 text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className={`text-[10px] font-bold ${levelConf.className}`}>
                        {levelConf.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className={`text-[10px] ${sourceConf.className}`}>
                        {sourceConf.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {log.flow ? (
                        <span className="text-muted-foreground font-medium">{FLOW_CONFIG[log.flow] ?? log.flow}</span>
                      ) : (
                        <span className="text-muted-foreground/40">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {log.action ? (
                        <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">{log.action}</span>
                      ) : (
                        <span className="text-muted-foreground/40">-</span>
                      )}
                    </td>
                    <td className="max-w-[300px] px-3 py-2.5 text-xs">
                      <span className={log.level === 'error' ? 'text-red-600 dark:text-red-400' : ''}>
                        {log.message.length > 80 ? `${log.message.slice(0, 80)}...` : log.message}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {log.userName ? (
                        <span className="font-medium">{log.userName}</span>
                      ) : log.userId ? (
                        <span className="text-muted-foreground font-mono text-[10px]">{log.userId.slice(-8)}</span>
                      ) : (
                        <span className="text-muted-foreground/40">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <UrlPagination totalPages={totalPages} />

      <AdminLogDetailDialog log={selectedLog} onClose={() => setSelectedLog(null)} />
    </>
  );
};
