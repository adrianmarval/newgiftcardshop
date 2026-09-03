'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPortalSwScope, apiQuery } from '@/lib/utils';

interface NotificationContextValue {
  unreadCounts: Record<string, number>;
  setUnreadCount: (portal: string, count: number) => void;
}

const NotificationContext = React.createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
  /** Badge key del portal actual (buyer | seller | admin). */
  badgeKey: string;
  /** Count server-rendered del primer paint (portal actual). */
  initialUnreadCount: number;
}

async function fetchUnreadCount() {
  const data = await apiQuery<{ success: true; count: number }>('unread-counts');
  return data.count;
}

export function NotificationProvider({ children, badgeKey, initialUnreadCount }: NotificationProviderProps) {
  const queryClient = useQueryClient();

  // Source of truth del badge: query ['unread-counts']. Los eventos SSE
  // 'notifications' la invalidan (refetch en el lugar, sin router.refresh);
  // los updates optimistas (dropdown/list) escriben directo en el cache.
  const { data: count } = useQuery({
    queryKey: ['unread-counts'],
    queryFn: fetchUnreadCount,
    initialData: initialUnreadCount,
  });

  // Registrar el service worker de Web Push (sin pedir permiso — eso se hace desde Settings).
  // Se registra con el scope del portal: INVARIANTE para que Android atribuya las
  // notificaciones a la PWA instalada y no a Chrome (ver getPortalSwScope).
  const pathname = usePathname();
  React.useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker
        .register('/sw.js', { scope: getPortalSwScope(pathname) })
        .catch(() => {});
    }
  }, [pathname]);

  const unreadCounts = React.useMemo(
    () => ({ buyer: 0, seller: 0, admin: 0, [badgeKey]: count }),
    [badgeKey, count],
  );

  const setUnreadCount = React.useCallback(
    (_portal: string, next: number) => {
      queryClient.setQueryData(['unread-counts'], next);
    },
    [queryClient],
  );

  const value = React.useMemo(
    () => ({ unreadCounts, setUnreadCount }),
    [unreadCounts, setUnreadCount],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
