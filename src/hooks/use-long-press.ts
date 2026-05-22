import { useCallback, useRef } from 'react';

interface UseLongPressOptions {
  threshold?: number;
  onLongPress: (e: any) => void;
  onClick?: (e: any) => void;
}

export function useLongPress({ threshold = 500, onLongPress, onClick }: UseLongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressHappened = useRef(false);

  const start = useCallback(
    (e: any) => {
      // Prevent default browser behavior like text selection or context menu on mobile
      if (e.type === 'touchstart') e.preventDefault();

      isLongPressHappened.current = false;
      timerRef.current = setTimeout(() => {
        onLongPress(e);
        isLongPressHappened.current = true;
      }, threshold);
    },
    [onLongPress, threshold],
  );

  const stop = useCallback(
    (e: any) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (!isLongPressHappened.current && onClick) {
        onClick(e);
      }

    },
    [onClick],
  );

  const cancel = useCallback((e: any) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onPointerMove: (e: any) => {
      // If user moves the pointer significantly, cancel the long press
      // (This helps with scrolling on mobile)
      if (timerRef.current && (Math.abs(e.movementX) > 10 || Math.abs(e.movementY) > 10)) {
        cancel(e);
      }
    },
    onContextMenu: (e: any) => e.preventDefault(),
  };
}
