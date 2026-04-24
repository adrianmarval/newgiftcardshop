'use client';

import { AnimatePresence } from 'framer-motion';
import { History } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { AdminBatchCard } from './admin-batch-card';
import type { AdminBatch } from '@/types/domain/admin';

interface AdminBatchesListProps {
  batches: AdminBatch[];
  selectedIds: Set<number>;
  onSelect: (id: number, selected: boolean) => void;
  onDeleted: () => void;
}

export function AdminBatchesList({ batches, selectedIds, onSelect, onDeleted }: AdminBatchesListProps) {
  const payableBatches = batches.filter((b) => !b.isPaid && b.confirmedCount === b.cardsCount && b.cardsCount > 0);
  const allPayableSelected = payableBatches.length > 0 && payableBatches.every((b) => selectedIds.has(b.id));

  const handleSelectAll = () => {
    if (allPayableSelected) {
      payableBatches.forEach((b) => onSelect(b.id, false));
    } else {
      payableBatches.forEach((b) => onSelect(b.id, true));
    }
  };

  if (batches.length === 0) {
    return (
      <EmptyState
        icon={<History className="text-muted-foreground/20 h-12 w-12" />}
        title="No se encontraron lotes"
        description="Intenta ajustar tus filtros o términos de búsqueda."
      />
    );
  }

  return (
    <div className="space-y-2">
      {payableBatches.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox checked={allPayableSelected} onCheckedChange={handleSelectAll} />
          <span className="text-muted-foreground text-sm">Seleccionar todos los pagables</span>
        </div>
      )}
      <AnimatePresence mode="popLayout">
        {batches.map((batch) => (
          <AdminBatchCard
            key={batch.id}
            batch={batch}
            isSelected={selectedIds.has(batch.id)}
            onSelect={(selected) => onSelect(batch.id, selected)}
            onDeleted={onDeleted}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
