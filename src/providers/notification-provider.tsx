'use client';

import * as React from 'react';

interface NotificationContextValue {
  unreadCounts: Record<string, number>;
  setUnreadCount: (portal: string, count: number) => void;
}

const NotificationContext = React.createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
  initialUnreadCounts?: Record<string, number>;
}

export function NotificationProvider({ children, initialUnreadCounts }: NotificationProviderProps) {
  const [unreadCounts, setUnreadCounts] = React.useState<Record<string, number>>(
    initialUnreadCounts ?? { buyer: 0, seller: 0, admin: 0 },
  );

  // Registrar el service worker de Web Push (sin pedir permiso — eso se hace desde Settings)
  React.useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Sync with server-provided counts when auto-refresh re-renders the parent
  React.useEffect(() => {
    if (initialUnreadCounts) {
      setUnreadCounts(initialUnreadCounts);
    }
  }, [initialUnreadCounts]);

  const setUnreadCount = React.useCallback((portal: string, count: number) => {
    setUnreadCounts((prev) => {
      if (prev[portal] === count) return prev;
      return { ...prev, [portal]: count };
    });
  }, []);

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
