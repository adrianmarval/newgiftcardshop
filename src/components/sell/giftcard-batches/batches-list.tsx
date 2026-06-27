'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { UrlPagination } from '@/components/ui/url-pagination';
import { BatchCard } from './batch-card';
import type { SellerBatch } from '@/types';

export interface BatchesListProps {
  batches: SellerBatch[];
  totalPages?: number;
}

export function BatchesList({ batches, totalPages }: BatchesListProps) {
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [lastExpandedId, setLastExpandedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll to top when expanding
  useEffect(() => {
    if (expandedBatch !== null) {
      const container = listRef.current?.closest('.overflow-y-scroll, .overflow-y-auto');
      if (container) {
        container.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
  }, [expandedBatch]);

  // Auto-expand batch if it contains a search match
  useEffect(() => {
    const batchWithMatch = batches.find((b) => b.giftcards.some((g) => g.isSearchMatch));
    if (batchWithMatch) {
      setExpandedBatch(batchWithMatch.id.toString());
    }
  }, [batches]);

  const handleToggle = (id: string) => {
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
        const element = document.getElementById(`registry-card-${lastExpandedId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
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
    <div className="space-y-1" ref={listRef}>
      <AnimatePresence>
        {batches
          .filter((batch) => expandedBatch === null || expandedBatch === batch.id.toString())
          .map((batch) => (
            <motion.div
              key={batch.id}
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
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
      <UrlPagination totalPages={totalPages ?? 1} />
    </div>
  );
}
