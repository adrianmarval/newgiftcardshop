'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Settings, ExternalLink, ChevronRight } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useNotifications } from '@/providers/notification-provider';
import { listNotifications, markAsRead } from '@/actions/notifications';
import { useAction } from 'next-safe-action/hooks';
import { NotificationIcon } from '@/components/common';
import { timeAgo } from '@/lib/utils';
import type { NotificationItem } from '@/types';
import type { AppSection } from '@/types';

interface NotificationDropdownProps {
  portal: AppSection;
  badgeKey: string;
  href: string;
  className?: string;
}

const PORTAL_LABELS: Record<AppSection, { all: string; settings: string; empty: string; header: string; markRead: string }> = {
  buy: { all: 'Ver todas', settings: 'Configuración', empty: 'Sin notificaciones', header: 'Notificaciones', markRead: 'Marcar leídas' },
  sell: { all: 'View all', settings: 'Settings', empty: 'No notifications', header: 'Notifications', markRead: 'Mark all read' },
  admin: { all: 'Ver todas', settings: 'Configuración', empty: 'Sin notificaciones', header: 'Notificaciones', markRead: 'Marcar leídas' },
};

const PORTAL_ROUTES: Record<AppSection, { notifications: string; settings: string }> = {
  buy: { notifications: '/store/dashboard/notifications', settings: '/store/dashboard/notifications' },
  sell: { notifications: '/sell/dashboard/notifications', settings: '/sell/dashboard/notifications' },
  admin: { notifications: '/admin/dashboard/notifications', settings: '/admin/dashboard/notifications' },
};

export function NotificationDropdown({ portal, badgeKey, href: _href, className }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { unreadCounts, setUnreadCount } = useNotifications();
  const count = unreadCounts[badgeKey] || 0;
  const labels = PORTAL_LABELS[portal];
  const routes = PORTAL_ROUTES[portal];

  const { execute: executeList, status: listStatus } = useAction(listNotifications, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setNotifications(
          data.notifications.map((n) => ({
            ...n,
            createdAt: new Date(n.createdAt),
          })) as NotificationItem[],
        );
        setLoaded(true);
      }
    },
  });

  const { execute: executeMarkAsRead } = useAction(markAsRead);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      executeList({ limit: 8, filter: 'all' });
    }
  };

  // Refetch en vivo: si el badge sube mientras el dropdown está abierto, llegó
  // una notificación nueva (vía auto-refresh de 15s) — traerla sin request extra.
  const prevCountRef = useRef(count);
  useEffect(() => {
    if (open && loaded && count > prevCountRef.current) {
      executeList({ limit: 8, filter: 'all' });
    }
    prevCountRef.current = count;
  }, [count, open, loaded, executeList]);

  const handleClick = (item: NotificationItem) => {
    if (!item.read) {
      setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      setUnreadCount(badgeKey, Math.max(0, count - 1));
      executeMarkAsRead({ notificationId: item.id });
    }
    setOpen(false);
    if (item.actionUrl) {
      router.push(item.actionUrl);
    }
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(badgeKey, 0);
    executeMarkAsRead({ all: true });
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={handleToggle} className={className}>
        <Mail className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground animate-pulse">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-lg border bg-popover shadow-md sm:w-80 max-sm:fixed max-sm:left-2 max-sm:right-2 max-sm:top-14 max-sm:w-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-base font-semibold">{labels.header}</span>
            {notifications.some((n) => !n.read) && (
              <button onClick={handleMarkAllRead} className="text-primary text-sm hover:underline">
                {labels.markRead}
              </button>
            )}
          </div>

          {/* List */}
          <div className="custom-scrollbar max-h-80 overflow-y-auto">
            {listStatus === 'executing' && !loaded ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="sm" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Mail className="text-muted-foreground/30 mb-1 h-6 w-6" />
                <p className="text-muted-foreground text-sm">{labels.empty}</p>
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleClick(item)}
                  className={`flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                    item.read ? 'opacity-100' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0"><NotificationIcon type={item.type} size="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${item.read ? 'text-muted-foreground/80' : 'font-medium'}`}>
                        {item.title}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-xs">{timeAgo(item.createdAt)}</span>
                    </div>
                    <p className="text-muted-foreground text-sm leading-snug">{item.description}</p>
                  </div>
                  {item.actionUrl && <ChevronRight className="text-muted-foreground/60 mt-1 h-4 w-4 shrink-0" />}
                  {!item.read && <span className="bg-primary mt-1.5 h-2 w-2 shrink-0 rounded-full" />}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-2.5 flex items-center justify-between">
            <Link
              href={routes.notifications}
              onClick={() => setOpen(false)}
              className="text-primary flex items-center gap-1.5 text-sm font-medium hover:underline"
            >
              {labels.all}
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={`${routes.settings}?tab=settings`}
              onClick={() => setOpen(false)}
              className="text-muted-foreground flex items-center gap-1.5 text-sm hover:text-foreground hover:underline"
            >
              <Settings className="h-3.5 w-3.5" />
              {labels.settings}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
