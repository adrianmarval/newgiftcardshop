'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UseAutoRefreshOptions {
  interval?: number;
  enabled?: boolean;
}

export function useAutoRefresh(options: UseAutoRefreshOptions = {}) {
  const { interval = 5000, enabled = true } = options;
  const router = useRouter();
  const [isActive, setIsActive] = useState(enabled);

  useEffect(() => {
    if (!enabled || !isActive) return;

    const id = setInterval(() => {
      router.refresh();
    }, interval);

    return () => clearInterval(id);
  }, [enabled, isActive, interval, router]);

  const pause = useCallback(() => setIsActive(false), []);
  const resume = useCallback(() => setIsActive(true), []);
  const toggle = useCallback(() => setIsActive((prev) => !prev), []);

  return { isActive, pause, resume, toggle };
}
