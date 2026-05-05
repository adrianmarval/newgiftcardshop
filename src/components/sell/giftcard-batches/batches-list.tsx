'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { BatchCard } from './batch-card';
import type { BatchesListProps } from './types';

export function BatchesList({ batches }: BatchesListProps) {
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [lastExpandedId, setLastExpandedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const savedScrollTop = useRef<number>(0);

  // Auto-expand batch if it contains a search match
  useEffect(() => {
    const batchWithMatch = batches.find((b) => b.giftcards.some((g) => g.isSearchMatch));
    if (batchWithMatch) {
      setExpandedBatch(batchWithMatch.id.toString());
    }
  }, [batches]);

  const handleToggle = (id: string) => {
    // Guardar el scroll actual antes de expandir si no hay nada expandido
    if (expandedBatch === null) {
      const container = listRef.current?.closest('.overflow-y-scroll, .overflow-y-auto');
      if (container) {
        savedScrollTop.current = container.scrollTop;
      }
    }

    setExpandedBatch((prev) => {
      const next = prev === id ? null : id;
      if (next === null) {
        setLastExpandedId(id);
      } else {
        setLastExpandedId(null);
      }
      return next;
    });
  };

  useEffect(() => {
    if (expandedBatch === null && lastExpandedId !== null) {
      const timer = setTimeout(() => {
        const container = listRef.current?.closest('.overflow-y-scroll, .overflow-y-auto');
        if (container && savedScrollTop.current > 0) {
          container.scrollTo({ top: savedScrollTop.current, behavior: 'auto' });
          savedScrollTop.current = 0;
        } else {
          const element = document.getElementById(`registry-card-${lastExpandedId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'auto', block: 'start' });
          }
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [expandedBatch, lastExpandedId]);

  if (batches.length === 0) {
    return (
      <EmptyState
        icon={<History className="text-muted-foreground/20 h-12 w-12" />}
        title="No batches found"
        description="Try adjusting your filters or search terms."
      />
    );
  }

  return (
    <div className="space-y-2" ref={listRef}>
      <AnimatePresence>
        {batches
          .filter((batch) => expandedBatch === null || expandedBatch === batch.id.toString())
          .map((batch) => (
            <motion.div
              key={batch.id}
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <BatchCard
                batch={batch}
                isExpanded={expandedBatch === batch.id.toString()}
                isHighlighted={lastExpandedId === batch.id.toString()}
                onToggle={() => handleToggle(batch.id.toString())}
              />
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
}
