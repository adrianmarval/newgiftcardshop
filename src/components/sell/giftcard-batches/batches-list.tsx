'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { BatchCard } from './batch-card';
import type { BatchesListProps } from './types';

export function BatchesList({ batches, onCardClick }: BatchesListProps) {
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  // Auto-expand batch if it contains a search match
  useEffect(() => {
    const batchWithMatch = batches.find((b) => b.giftcards.some((g) => g.isSearchMatch));
    if (batchWithMatch) {
      setExpandedBatch(batchWithMatch.id.toString());
    }
  }, [batches]);

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
    <div className="space-y-2">
      <AnimatePresence>
        {batches
          .filter((batch) => expandedBatch === null || expandedBatch === batch.id.toString())
          .map((batch) => (
          <motion.div
            key={batch.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <BatchCard
              batch={batch}
              isExpanded={expandedBatch === batch.id.toString()}
              onToggle={() => setExpandedBatch(expandedBatch === batch.id.toString() ? null : batch.id.toString())}
              onCardClick={onCardClick}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
