'use client';

import { useState } from 'react';
import { BatchesFilters } from './batches-filters';
import { BatchesList } from './batches-list';
import { CardDetailDialog } from './card-detail-dialog';
import type { SellerBatchesViewProps } from './types';
import type { Giftcard } from '@/types';
import { StatusLeyend } from '@/components/ui/status-leyend';

export function SellerBatchesView({ batches, pagination }: SellerBatchesViewProps) {
  const [selectedCard, setSelectedCard] = useState<Giftcard | null>(null);

  const handleCardClick = (card: Giftcard) => {
    setSelectedCard(card);
  };

  return (
    <div className="space-y-4">
      <StatusLeyend language='en' />
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
