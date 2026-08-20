'use client';

import { useEffect, useRef } from 'react';

interface UseStepHotkeysOptions {
  onContinue: () => void;
  enabled?: boolean;
}

export function useStepHotkeys({ onContinue, enabled = true }: UseStepHotkeysOptions) {
  const onContinueRef = useRef(onContinue);

  useEffect(() => {
    onContinueRef.current = onContinue;
  });

  useEffect(() => {
    if (!enabled) return;

    const isOverlayOpen = () =>
      document.querySelector('[role="dialog"][data-state="open"]') !== null;

    const isInsideOverlay = (target: HTMLElement | null) =>
      target?.closest('[role="listbox"], [role="option"], [role="menu"], [role="menuitem"], [role="tree"], [role="treeitem"], [data-radix-select-content]') !== null;

    const handler = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if (isOverlayOpen()) return;

      const target = e.target as HTMLElement;
      const tag = target?.tagName?.toLowerCase();

      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onContinueRef.current();
        return;
      }

      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
        if (tag === 'textarea') return;
        if (tag === 'button') return;
        if (tag === 'select') return;
        if (target?.isContentEditable) return;
        if (isInsideOverlay(target)) return;
        e.preventDefault();
        onContinueRef.current();
      }
    };

    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [enabled]);
}
