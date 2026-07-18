'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonitorSmartphone, LogOut } from 'lucide-react';
import { LogoutButton } from '@/components/auth/logout-button';
import { getActiveSessions } from '@/actions/auth/get-active-sessions';
import { revokeOtherSessions } from '@/actions/auth/revoke-other-sessions';
import { useAction } from 'next-safe-action/hooks';
import { Spinner } from '@/components/ui/spinner';
import { showAlert } from '@/lib/ui';
import { useLocale } from '@/hooks/use-locale';

function parseUserAgent(ua: string | null): { icon: string; label: string } {
  if (!ua) return { icon: '🌐', label: 'Unknown device' };
  if (/android/i.test(ua)) return { icon: '📱', label: 'Android' };
  if (/iphone|ipad|ipod/i.test(ua)) return { icon: '📱', label: /ipad/i.test(ua) ? 'iPad' : 'iPhone' };
  if (/mac/i.test(ua)) return { icon: '🖥️', label: 'Mac' };
  if (/windows/i.test(ua)) return { icon: '🖥️', label: 'Windows' };
  if (/linux/i.test(ua)) return { icon: '🐧', label: 'Linux' };
  if (/bot|crawler|spider/i.test(ua)) return { icon: '🤖', label: 'Bot' };
  return { icon: '🌐', label: 'Unknown device' };
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const SessionsSection = () => {
  const { isSpanish } = useLocale();
  const pathname = usePathname();
  const portal = pathname.includes('/admin') ? 'admin' : pathname.includes('/sell') ? 'sell' : 'buy';

  const [sessions, setSessions] = useState<
    Array<{ id: string; ipAddress: string | null; userAgent: string | null; createdAt: Date; expiresAt: Date }>
  >([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);

  const { execute: executeGetSessions, status: sessionsStatus } = useAction(getActiveSessions, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setSessions(data.sessions);
        setSessionsLoaded(true);
      }
    },
  });

  const { execute: executeRevoke, status: revokeStatus } = useAction(revokeOtherSessions, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        showAlert.toast.success(isSpanish ? `${data.revokedCount} sesiones revocadas` : `${data.revokedCount} sessions revoked`);
        setSessions((prev) => prev.filter((_, i) => i === 0));
      }
    },
  });

  useEffect(() => {
    executeGetSessions();
  }, []);

  return (
    <Card className="gap-0">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 md:h-9 md:w-9 md:rounded-lg">
          <MonitorSmartphone className="h-3.5 w-3.5 text-emerald-400 md:h-4 md:w-4" />
        </div>
        <div>
          <CardTitle className="text-sm md:text-lg">{isSpanish ? 'Sesiones activas' : 'Active sessions'}</CardTitle>
          <p className="text-muted-foreground hidden text-xs md:block md:text-sm">
            {isSpanish ? 'Dispositivos conectados a tu cuenta' : 'Devices connected to your account'}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {sessionsStatus === 'executing' && !sessionsLoaded ? (
          <Spinner size="sm" />
        ) : (
          <div className="space-y-1.5">
            {sessions.map((s, i) => {
              const isCurrent = i === 0;
              const device = parseUserAgent(s.userAgent);
              return (
                <div
                  key={s.id}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs ${
                    isCurrent ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{device.icon}</span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-foreground font-medium">{device.label}</span>
                      <span className="text-muted-foreground">
                        {s.ipAddress || '—'} · {formatDate(s.createdAt)}
                      </span>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                      {isSpanish ? 'Actual' : 'Current'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {sessions.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive w-full justify-start gap-1.5 text-xs"
            disabled={revokeStatus === 'executing'}
            onClick={() => executeRevoke()}
          >
            <LogOut className="h-3.5 w-3.5" />
            {revokeStatus === 'executing'
              ? isSpanish
                ? 'Revocando...'
                : 'Revoking...'
              : isSpanish
                ? `Cerrar otras sesiones (${sessions.length - 1})`
                : `Revoke other sessions (${sessions.length - 1})`}
          </Button>
        )}

        <LogoutButton
          portal={portal}
          variant="outline"
          className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive w-full justify-start md:justify-between"
        />
      </CardContent>
    </Card>
  );
};
