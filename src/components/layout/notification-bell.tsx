'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/contexts/notification-context';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  href: string;
  badgeKey: string;
  className?: string;
}

export function NotificationBell({ href, badgeKey, className }: NotificationBellProps) {
  const { unreadCounts } = useNotifications();
  const count = unreadCounts[badgeKey] || 0;

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <Link
      href={href}
      className={cn(
        'relative flex h-9 w-9 items-center justify-center rounded-full transition-colors',
        'text-muted-foreground hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground animate-pulse">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
