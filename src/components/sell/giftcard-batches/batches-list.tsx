'use client';

import { RegistryList } from '@/components/common';
import { BatchCard } from './batch-card';
import type { SellerBatch } from '@/types';

export interface BatchesListProps {
  batches: SellerBatch[];
  totalPages?: number;
  search?: string;
}

export function BatchesList({ batches, search }: BatchesListProps) {
  return (
    <RegistryList
      items={batches}
      getId={(b) => b.id}
      getMatch={(b) => {
        if (b.giftcards.some((g) => g.isSearchMatch)) return b.id;
        if (search && !isNaN(Number(search)) && b.id === Number(search)) return b.id;
        return null;
      }}
      emptyTitle="No batches found"
      emptyDescription="Try adjusting your filters or search terms."
      renderItem={(batch, { isExpanded, isHighlighted, onToggle }) => (
        <div data-tour={batch.id === batches[0]?.id ? 'batch-card' : undefined}>
          <BatchCard
            batch={batch}
            isExpanded={isExpanded}
            isHighlighted={isHighlighted}
            onToggle={onToggle}
          />
        </div>
      )}
    />
  );
}