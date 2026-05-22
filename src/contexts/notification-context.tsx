'use client';

import * as React from 'react';

interface NotificationContextValue {
  unreadCounts: Record<string, number>;
  setUnreadCount: (portal: string, count: number) => void;
}

const NotificationContext = React.createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCounts, setUnreadCounts] = React.useState<Record<string, number>>({
    buyer: 0,
    seller: 0,
    admin: 0,
  });

  const setUnreadCount = React.useCallback((portal: string, count: number) => {
    setUnreadCounts((prev) => {
      if (prev[portal] === count) return prev;
      return { ...prev, [portal]: count };
    });
  }, []);

  const value = React.useMemo(
    () => ({ unreadCounts, setUnreadCount }),
    [unreadCounts, setUnreadCount]
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