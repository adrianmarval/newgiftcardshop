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
  const [isManualActive, setIsManualActive] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(true);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };

    const handleFocus = () => setIsTabVisible(true);
    const handleBlur = () => setIsTabVisible(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Initial check
    setIsTabVisible(document.visibilityState === 'visible' && document.hasFocus());

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [enabled]);

  useEffect(() => {
    const isActuallyActive = enabled && isManualActive && isTabVisible;
    if (!isActuallyActive) return;

    // Refresh immediately when tab becomes active/visible
    router.refresh();

    const id = setInterval(() => {
      router.refresh();
    }, interval);

    return () => clearInterval(id);
  }, [enabled, isManualActive, isTabVisible, interval, router]);

  const pause = useCallback(() => setIsManualActive(false), []);
  const resume = useCallback(() => setIsManualActive(true), []);
  const toggle = useCallback(() => setIsManualActive((prev) => !prev), []);

  return {
    isActive: isManualActive && isTabVisible,
    isPaused: !isManualActive,
    pause,
    resume,
    toggle,
  };
}
