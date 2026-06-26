'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
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

export function NotificationsList({ portal, initialNotifications, initialUnreadCount }: NotificationsListProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const { setUnreadCount } = useNotifications();

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
        <div className="border-border bg-muted/40 mb-2 rounded-full border p-5">
          <Bell className="text-muted-foreground/40 h-8 w-8" />
        </div>
        <p className="text-muted-foreground text-sm">Sin Notificaciones</p>
      </div>
    );
  }

  return (
    <Card className="flex h-full min-h-[400px] flex-col">
      {unreadCount > 0 && (
        <div className="border-border flex items-center justify-between border-b px-4 py-2">
          <Badge variant="secondary" className="gap-1">
            <span className="bg-primary inline-flex h-1.5 w-1.5 rounded-full" />
            {unreadCount} sin leer
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="h-7 text-xs">
            Marcar leídas
          </Button>
        </div>
      )}

      <CardContent className="flex-1 space-y-1 overflow-y-auto p-2">
        {notifications.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item)}
            className={`group flex w-full items-start gap-2.5 rounded-xl border p-3 text-left transition-colors ${
              item.read ? 'border-transparent opacity-50' : 'border-border bg-muted/30 hover:bg-muted/50'
            }`}
          >
            <div className="mt-0.5 shrink-0"><NotificationIcon type={item.type} /></div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className={`truncate text-sm ${item.read ? 'text-muted-foreground font-normal' : 'font-medium'}`}>{item.title}</span>
                <span className="text-muted-foreground shrink-0 text-[10px]">{timeAgo(item.createdAt)}</span>
              </div>
              <p className="text-muted-foreground truncate text-xs">{item.description}</p>
            </div>

            {!item.read && <span className="bg-primary mt-1 h-2 w-2 shrink-0 rounded-full" />}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
