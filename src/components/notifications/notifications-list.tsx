'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, ExternalLink } from 'lucide-react';
import { useNotifications } from '@/providers/notification-provider';
import { markAsRead } from '@/actions/notifications';
import { useAction } from 'next-safe-action/hooks';
import { NotificationIcon } from '@/components/common';
import { timeAgo, apiQuery } from '@/lib/utils';
import type { NotificationItem } from '@/types';

export interface NotificationsListProps {
  portal: 'buyer' | 'seller' | 'admin';
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
}

const LIST_TEXTS = {
  seller: { empty: 'No notifications', unread: 'unread', markRead: 'Mark all read', view: 'View' },
  buyer: { empty: 'Sin Notificaciones', unread: 'sin leer', markRead: 'Marcar leídas', view: 'Ver' },
  admin: { empty: 'Sin Notificaciones', unread: 'sin leer', markRead: 'Marcar leídas', view: 'Ver' },
} as const;

/** Debe matchear el `take` de getNotificationPageData (primer paint server). */
const PAGE_LIMIT = 50;

async function fetchNotifications(): Promise<NotificationItem[]> {
  const data = await apiQuery<{ success: true; notifications: NotificationItem[] }>('notifications-page', {
    page: 1,
    limit: PAGE_LIMIT,
    filter: 'all',
  });
  return data.notifications;
}

export function NotificationsList({ portal, initialNotifications }: NotificationsListProps) {
  const queryClient = useQueryClient();
  const { setUnreadCount } = useNotifications();
  const router = useRouter();
  const texts = LIST_TEXTS[portal];

  // Data viva via React Query: los eventos SSE 'notifications' invalidan
  // ['notifications-page'] y la lista se actualiza EN EL LUGAR (sin
  // router.refresh, sin races con la navegación).
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications-page'],
    queryFn: fetchNotifications,
    initialData: initialNotifications,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const { execute: executeMarkAsRead } = useAction(markAsRead);

  const setItems = (updater: (prev: NotificationItem[]) => NotificationItem[]) => {
    queryClient.setQueryData<NotificationItem[]>(['notifications-page'], (old) => updater(old ?? []));
  };

  const handleClick = (item: NotificationItem) => {
    if (!item.read) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      setUnreadCount(portal, notifications.filter((n) => !n.read && n.id !== item.id).length);
      executeMarkAsRead({ notificationId: item.id });
    }
    if (item.actionUrl) {
      router.push(item.actionUrl);
    }
  };

  const handleMarkAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(portal, 0);
    executeMarkAsRead({ all: true });
  };

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="border-border bg-muted/40 mb-3 rounded-full border p-5">
          <Bell className="text-muted-foreground/40 h-10 w-10" />
        </div>
        <p className="text-muted-foreground text-base">{texts.empty}</p>
      </div>
    );
  }

  return (
    <Card className="flex h-full min-h-[400px] flex-col">
      {unreadCount > 0 && (
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <Badge variant="secondary" className="gap-1.5 text-sm">
            <span className="bg-primary inline-flex h-2 w-2 rounded-full" />
            {unreadCount} {texts.unread}
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="h-8 text-sm">
            {texts.markRead}
          </Button>
        </div>
      )}

      <CardContent className="flex-1 space-y-1.5 overflow-y-auto p-3">
        {notifications.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item)}
            className={`group flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
              item.read ? 'border-transparent opacity-100' : 'border-border bg-muted/30 hover:bg-muted/50'
            }`}
          >
            <div className="mt-0.5 shrink-0"><NotificationIcon type={item.type} size="h-5 w-5" /></div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className={`truncate text-base ${item.read ? 'text-muted-foreground/80 font-normal' : 'font-medium'}`}>{item.title}</span>
                <span className="text-muted-foreground shrink-0 text-xs">{timeAgo(item.createdAt)}</span>
              </div>
              <p className="text-muted-foreground text-sm leading-snug">{item.description}</p>
              {item.actionUrl && (
                <span className="text-primary mt-1 inline-flex items-center gap-1 text-xs font-medium">
                  {texts.view}
                  <ExternalLink className="h-3 w-3" />
                </span>
              )}
            </div>

            {!item.read && <span className="bg-primary mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" />}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
