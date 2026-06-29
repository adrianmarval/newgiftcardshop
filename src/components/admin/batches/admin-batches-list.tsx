'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { RegistryList } from '@/components/common';
import { AdminBatchCard } from './admin-batch-card';
import type { AdminBatch } from '@/types';

interface AdminBatchesListProps {
  batches: AdminBatch[];
  selectedIds: Set<number>;
  onSelect: (id: number, selected: boolean) => void;
  onDeleted: () => void;
  onViewSeller?: (batch: AdminBatch) => void;
}

export function AdminBatchesList({ batches, selectedIds, onSelect, onDeleted, onViewSeller }: AdminBatchesListProps) {
  const payableBatches = batches.filter((b) => !b.isPaid && b.confirmedCount === b.cardsCount && b.cardsCount > 0);
  const allPayableSelected = payableBatches.length > 0 && payableBatches.every((b) => selectedIds.has(b.id));

  const handleSelectAll = () => {
    payableBatches.forEach((b) => onSelect(b.id, !allPayableSelected));
  };

  return (
    <RegistryList
      items={batches}
      getId={(b) => b.id}
      getMatch={(b) => b.giftcards.some((g) => g.isSearchMatch) ? b.id : null}
      emptyTitle="No se encontraron lotes"
      emptyDescription="Intenta ajustar tus filtros o términos de búsqueda."
      toolbar={
        payableBatches.length > 0 ? (
          <div className="flex items-center gap-1 px-1">
            <Checkbox checked={allPayableSelected} onCheckedChange={handleSelectAll} className="cursor-pointer" />
            <span className="text-muted-foreground text-sm md:text-lg">Seleccionar todos los pagables</span>
          </div>
        ) : null
      }
      renderItem={(batch, { isExpanded, isHighlighted, onToggle }) => (
        <AdminBatchCard
          batch={batch}
          isSelected={selectedIds.has(batch.id)}
          onSelect={(selected) => onSelect(batch.id, selected)}
          onDeleted={onDeleted}
          onViewSeller={onViewSeller}
          isExpanded={isExpanded}
          isHighlighted={isHighlighted}
          onToggle={onToggle}
        />
      )}
    />
  );
}