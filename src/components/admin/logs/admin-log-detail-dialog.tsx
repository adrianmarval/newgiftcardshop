'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { AppLogItem } from '@/types';
import { formatDateTime } from '@/lib/utils';

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

interface AdminLogDetailDialogProps {
  log: AppLogItem | null;
  onClose: () => void;
}

export const AdminLogDetailDialog = ({ log, onClose }: AdminLogDetailDialogProps) => {
  if (!log) return null;

  const levelConf = LEVEL_CONFIG[log.level] ?? LEVEL_CONFIG.info;
  const sourceConf = SOURCE_CONFIG[log.source] ?? SOURCE_CONFIG.system;
  const rawError = log.error;
  const errorObj = rawError && typeof rawError === 'object' ? (rawError as { name?: string; message?: string; stack?: string }) : null;

  return (
    <Dialog open={!!log} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs font-bold ${levelConf.className}`}>
              {levelConf.label}
            </Badge>
            <Badge variant="outline" className={`text-xs ${sourceConf.className}`}>
              {sourceConf.label}
            </Badge>
            {log.flow && <span className="text-muted-foreground text-sm font-normal">/{log.flow}</span>}
            {log.action && <span className="text-muted-foreground text-sm font-normal">/{log.action}</span>}
          </DialogTitle>
          <DialogDescription>
            {formatDateTime(log.timestamp, 'es-AR')} {log.userName ? `· ${log.userName}` : ''} {log.ip ? `· IP: ${log.ip}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          <div className="space-y-4 pr-4">
            {/* Mensaje */}
            <div>
              <h4 className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wider">Mensaje</h4>
              <p className="bg-muted rounded-md p-3 text-sm">{log.message}</p>
            </div>

            {/* Error */}
            {errorObj !== null && (
              <div>
                <h4 className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wider">Error</h4>
                <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
                  {errorObj.name && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{errorObj.name}</p>}
                  {errorObj.message && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errorObj.message}</p>}
                  {errorObj.stack && (
                    <pre className="mt-2 max-h-40 overflow-auto text-xs whitespace-pre-wrap text-red-500/80">{errorObj.stack}</pre>
                  )}
                </div>
              </div>
            )}

            {/* Metadata */}
            {log.metadata !== null && log.metadata !== undefined && (
              <div>
                <h4 className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wider">Metadata</h4>
                <pre className="bg-muted max-h-60 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}

            {/* Detalles adicionales */}
            <div className="grid grid-cols-2 gap-3">
              {log.userId && (
                <div>
                  <h4 className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wider">User ID</h4>
                  <p className="bg-muted rounded px-2 py-1 font-mono text-xs">{log.userId}</p>
                </div>
              )}
              {log.id && (
                <div>
                  <h4 className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wider">Log ID</h4>
                  <p className="bg-muted rounded px-2 py-1 font-mono text-xs">{log.id}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
