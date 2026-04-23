'use client';

import { useState } from 'react';
import { BatchesStats } from './batches-stats';
import { BatchesFilters } from './batches-filters';
import { BatchesList } from './batches-list';
import { CardDetailDialog } from './card-detail-dialog';
import type { SellerBatchesViewProps } from './types';
import type { Giftcard } from '@/types';

export function SellerBatchesView({ batches, pagination }: SellerBatchesViewProps) {
  const [selectedCard, setSelectedCard] = useState<Giftcard | null>(null);

  const handleCardClick = (card: Giftcard) => {
    setSelectedCard(card);
  };

  return (
    <div className="space-y-2">
      <BatchesStats batches={batches} />
      <BatchesFilters />
      <BatchesList batches={batches} totalPages={pagination?.totalPages} onCardClick={handleCardClick} />
      <CardDetailDialog
        card={selectedCard}
        open={!!selectedCard}
        onOpenChange={(open) => {
          if (!open) setSelectedCard(null);
        }}
      />
    </div>
  );
}
