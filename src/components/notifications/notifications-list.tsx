'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/providers/notification-provider';
import { markAsRead } from '@/actions/notifications';
import { useAction } from 'next-safe-action/hooks';
import { NotificationIcon } from '@/components/common';
import { timeAgo } from '@/lib/utils';
import type { NotificationItem } from '@/types';

export interface NotificationsListProps {
  portal: 'buyer' | 'seller' | 'admin';
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
}

const LIST_TEXTS = {
  seller: { empty: 'No notifications', unread: 'unread', markRead: 'Mark all read' },
  buyer: { empty: 'Sin Notificaciones', unread: 'sin leer', markRead: 'Marcar leídas' },
  admin: { empty: 'Sin Notificaciones', unread: 'sin leer', markRead: 'Marcar leídas' },
} as const;

export function NotificationsList({ portal, initialNotifications, initialUnreadCount: _initialUnreadCount }: NotificationsListProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const { setUnreadCount } = useNotifications();
  const texts = LIST_TEXTS[portal];

  // Sync with server props when parent re-renders (auto-refresh)
  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const { execute: executeMarkAsRead } = useAction(markAsRead, {
    onSuccess: () => {
      setUnreadCount(portal, notifications.filter((n) => !n.read).length);
    },
  });

  const handleClick = (item: NotificationItem) => {
    if (!item.read) {
      setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      executeMarkAsRead({ notificationId: item.id });
    }
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    executeMarkAsRead({ all: true });
  };

  if (initialNotifications.length === 0) {
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
            </div>

            {!item.read && <span className="bg-primary mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" />}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
