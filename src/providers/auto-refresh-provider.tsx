'use client';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

interface AutoRefreshProviderProps {
  children: React.ReactNode;
  interval?: number;
  enabled?: boolean;
}

export function AutoRefreshProvider({ children, interval = 5000, enabled = true }: AutoRefreshProviderProps) {
  useAutoRefresh({ interval, enabled });
  return <>{children}</>;
}
