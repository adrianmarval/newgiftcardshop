'use client';

import { ReactNode, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

// ── Generic hook for auto-expand on search match ─────────────────────────────

export function useRegistryAutoExpand<T>(items: T[], getMatch: (item: T) => string | number | null, getId: (item: T) => string | number) {
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [lastExpandedId, setLastExpandedId] = useState<string | number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const userInteractingRef = useRef(false);
  const prevMatchIdRef = useRef<string | number | null>(null);

  // Scroll to top when expanding
  useEffect(() => {
    if (expandedId !== null) {
      const container = listRef.current?.closest('.overflow-y-scroll, .overflow-y-auto');
      if (container) {
        (container as HTMLElement).scrollTo({ top: 0, behavior: 'auto' });
      }
    }
  }, [expandedId]);

  // Compute first item with search match
  const matchId = useMemo(() => {
    const item = items.find((i) => getMatch(i) !== null);
    return item ? getMatch(item) : null;
  }, [items, getMatch]);

  // Auto-expand when a match appears; auto-collapse when the match disappears
  // (e.g. filters cleared) so the full list is shown again. Manual toggles
  // (user interacting) are never overridden.
  useEffect(() => {
    if (!userInteractingRef.current) {
      if (matchId !== null) {
        setExpandedId(matchId);
      } else if (prevMatchIdRef.current !== null) {
        setExpandedId(null);
      }
    }
    prevMatchIdRef.current = matchId;
  }, [matchId]);

  // Collapse when the expanded item is no longer in the list
  // (e.g. page change, filter change removes it)
  useEffect(() => {
    if (expandedId !== null && items.length > 0) {
      const stillPresent = items.some((i) => getId(i) === expandedId);
      if (!stillPresent) {
        setExpandedId(null);
        setLastExpandedId(null);
      }
    }
  }, [expandedId, items, getId]);

  const handleToggle = useCallback((id: string | number) => {
    userInteractingRef.current = true;
    setExpandedId((prev) => {
      const next = prev === id ? null : id;
      setLastExpandedId(next === null ? id : null);
      return next;
    });
    setTimeout(() => {
      userInteractingRef.current = false;
    }, 500);
  }, []);

  // Smooth scroll back to previously expanded item when collapsed
  useEffect(() => {
    if (expandedId === null && lastExpandedId !== null) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`registry-card-${lastExpandedId}`);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [expandedId, lastExpandedId]);

  return { expandedId, lastExpandedId, listRef, handleToggle };
}

// ── Generic list component ───────────────────────────────────────────────────

export interface RegistryListProps<T> {
  items: T[];
  /** Returns the id (string|number) of the item containing a search match, or null. */
  getMatch: (item: T) => string | number | null;
  /** Extracts a comparable id from each item. */
  getId: (item: T) => string | number;
  /** Renders each item's card. */
  renderItem: (item: T, props: {
    isExpanded: boolean;
    isHighlighted: boolean;
    onToggle: () => void;
  }) => ReactNode;
  /** Optional pre-list toolbar (e.g., "Select all payable" checkbox). */
  toolbar?: ReactNode;
  /** Empty state title. */
  emptyTitle?: string;
  /** Empty state description. */
  emptyDescription?: string;
  /** Optional icon for empty state. */
  emptyIcon?: ReactNode;
}

export function RegistryList<T>({
  items,
  getMatch,
  getId,
  renderItem,
  toolbar,
  emptyTitle = 'No se encontraron registros',
  emptyDescription = 'Intenta ajustar tus filtros o palabras clave de búsqueda.',
  emptyIcon,
}: RegistryListProps<T>) {
  const { expandedId, lastExpandedId, listRef, handleToggle } = useRegistryAutoExpand(items, getMatch, getId);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon ?? <History className="text-muted-foreground/20 h-12 w-12" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="space-y-1" ref={listRef}>
      {toolbar}
      <AnimatePresence>
        {items
          .filter((item) => expandedId === null || expandedId === getId(item))
          .map((item) => {
            const id = getId(item);
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                {renderItem(item, {
                  isExpanded: expandedId === id,
                  isHighlighted: lastExpandedId === id,
                  onToggle: () => handleToggle(id),
                })}
              </motion.div>
            );
          })}
      </AnimatePresence>
    </div>
  );
}