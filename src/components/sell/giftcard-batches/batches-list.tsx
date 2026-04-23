'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { History } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { BatchCard } from './batch-card';
import type { BatchesListProps } from './types';

export function BatchesList({ batches, onCardClick }: BatchesListProps) {
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

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
      <AnimatePresence mode="popLayout">
        {batches.map((batch) => (
          <BatchCard
            key={batch.id}
            batch={batch}
            isExpanded={expandedBatch === batch.id.toString()}
            onToggle={() => setExpandedBatch(expandedBatch === batch.id.toString() ? null : batch.id.toString())}
            onCardClick={onCardClick}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
