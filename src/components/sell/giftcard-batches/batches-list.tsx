'use client';

import { RegistryList } from '@/components/common';
import { BatchCard } from './batch-card';
import type { SellerBatch } from '@/types';

export interface BatchesListProps {
  batches: SellerBatch[];
  totalPages?: number;
}

export function BatchesList({ batches }: BatchesListProps) {
  return (
    <RegistryList
      items={batches}
      getId={(b) => b.id}
      getMatch={(b) => b.giftcards.some((g) => g.isSearchMatch) ? b.id : null}
      emptyTitle="No batches found"
      emptyDescription="Try adjusting your filters or search terms."
      renderItem={(batch, { isExpanded, isHighlighted, onToggle }) => (
        <BatchCard
          batch={batch}
          isExpanded={isExpanded}
          isHighlighted={isHighlighted}
          onToggle={onToggle}
        />
      )}
    />
  );
}