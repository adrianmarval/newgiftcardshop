'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Check, Settings, ExternalLink } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useNotifications } from '@/contexts/notification-context';
import { listNotifications, markAsRead } from '@/actions';
import { useAction } from 'next-safe-action/hooks';
import type { NotificationItem } from '@/components/notifications/notifications-page-client';
import type { AppSection } from '@/types';

interface NotificationDropdownProps {
  portal: AppSection;
  badgeKey: string;
  href: string;
  className?: string;
}

const PORTAL_LABELS: Record<AppSection, { all: string; settings: string; empty: string }> = {
  buy: { all: 'Ver todas', settings: 'Configuración', empty: 'Sin notificaciones' },
  sell: { all: 'View all', settings: 'Settings', empty: 'No notifications' },
  admin: { all: 'Ver todas', settings: 'Configuración', empty: 'Sin notificaciones' },
};

const PORTAL_ROUTES: Record<AppSection, { notifications: string; settings: string }> = {
  buy: { notifications: '/store/dashboard/notifications', settings: '/store/dashboard/notifications' },
  sell: { notifications: '/sell/dashboard/notifications', settings: '/sell/dashboard/notifications' },
  admin: { notifications: '/admin/dashboard/notifications', settings: '/admin/dashboard/notifications' },
};

const getIcon = (type: NotificationItem['type']) => {
  switch (type) {
    case 'STOCK_AVAILABLE':
    case 'TIER_DROP_ACCESS':
    case 'ORDER_COMPLETED':
    case 'BATCH_PAID':
      return <Check className="h-3.5 w-3.5 text-emerald-500" />;
    case 'PAYMENT_PENDING':
      return <Bell className="h-3.5 w-3.5 text-orange-500" />;
    default:
      return <Bell className="text-primary h-3.5 w-3.5" />;
  }
};

const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

export function NotificationDropdown({ portal, badgeKey, href, className }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
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

  const { execute: executeMarkAsRead } = useAction(markAsRead, {
    onSuccess: () => {
      setUnreadCount(portal, 0);
    },
  });

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
    if (next && !loaded) {
      executeList({ limit: 8, filter: 'all' });
    }
  };

  const handleClick = (item: NotificationItem) => {
    if (!item.read) {
      setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      executeMarkAsRead({ notificationId: item.id });
      setUnreadCount(portal, Math.max(0, count - 1));
    }
    if (item.actionUrl) {
      window.location.href = item.actionUrl;
    }
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    executeMarkAsRead({ all: true });
    setUnreadCount(portal, 0);
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={handleToggle} className={className}>
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground animate-pulse">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-lg border bg-popover shadow-md sm:w-80 max-sm:fixed max-sm:left-2 max-sm:right-2 max-sm:top-14 max-sm:w-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-semibold">Notificaciones</span>
            {notifications.some((n) => !n.read) && (
              <button onClick={handleMarkAllRead} className="text-primary text-xs hover:underline">
                Marcar leídas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {listStatus === 'executing' && !loaded ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="sm" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Bell className="text-muted-foreground/30 mb-1 h-6 w-6" />
                <p className="text-muted-foreground text-xs">{labels.empty}</p>
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleClick(item)}
                  className={`flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${
                    item.read ? 'opacity-50' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{getIcon(item.type)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-xs ${item.read ? 'text-muted-foreground' : 'font-medium'}`}>
                        {item.title}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-[10px]">{formatTimeAgo(item.createdAt)}</span>
                    </div>
                    <p className="text-muted-foreground truncate text-[11px]">{item.description}</p>
                  </div>
                  {!item.read && <span className="bg-primary mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-3 py-2 flex items-center justify-between">
            <Link
              href={routes.notifications}
              onClick={() => setOpen(false)}
              className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
            >
              {labels.all}
              <ExternalLink className="h-3 w-3" />
            </Link>
            <Link
              href={`${routes.settings}?tab=settings`}
              onClick={() => setOpen(false)}
              className="text-muted-foreground flex items-center gap-1 text-xs hover:text-foreground hover:underline"
            >
              <Settings className="h-3 w-3" />
              {labels.settings}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
