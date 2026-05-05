'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  onViewSeller?: (batch: AdminBatch) => void;
}

export function AdminBatchesList({ batches, selectedIds, onSelect, onDeleted, onViewSeller }: AdminBatchesListProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lastExpandedId, setLastExpandedId] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const savedScrollTop = useRef<number>(0);

  // Auto-expand batch if it contains a search match
  useEffect(() => {
    const batchWithMatch = batches.find((b) => b.giftcards.some((g) => g.isSearchMatch));
    if (batchWithMatch) {
      setExpandedId(batchWithMatch.id);
    }
  }, [batches]);

  const handleToggle = (batchId: number) => {
    // Guardar el scroll actual antes de expandir si no hay nada expandido
    if (expandedId === null) {
      const container = listRef.current?.closest('.overflow-y-scroll, .overflow-y-auto');
      if (container) {
        savedScrollTop.current = container.scrollTop;
      }
    }

    setExpandedId((prev) => {
      const next = prev === batchId ? null : batchId;
      if (next === null) {
        setLastExpandedId(batchId);
      } else {
        setLastExpandedId(null);
      }
      return next;
    });
  };

  useEffect(() => {
    if (expandedId === null && lastExpandedId !== null) {
      const timer = setTimeout(() => {
        const container = listRef.current?.closest('.overflow-y-scroll, .overflow-y-auto');
        if (container && savedScrollTop.current > 0) {
          container.scrollTo({ top: savedScrollTop.current, behavior: 'auto' });
          // Limpiamos el scroll guardado después de usarlo
          savedScrollTop.current = 0;
        } else {
          // Fallback por si falla el guardado de scroll
          const element = document.getElementById(`registry-card-${lastExpandedId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'auto', block: 'start' });
          }
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [expandedId, lastExpandedId]);

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
    <div className="space-y-2" ref={listRef}>
      {payableBatches.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox checked={allPayableSelected} onCheckedChange={handleSelectAll} className="cursor-pointer" />
          <span className="text-muted-foreground text-sm md:text-lg">Seleccionar todos los pagables</span>
        </div>
      )}
      <AnimatePresence>
        {batches
          .filter((batch) => expandedId === null || expandedId === batch.id)
          .map((batch) => (
            <motion.div
              key={batch.id}
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <AdminBatchCard
                batch={batch}
                isSelected={selectedIds.has(batch.id)}
                onSelect={(selected) => onSelect(batch.id, selected)}
                onDeleted={onDeleted}
                onViewSeller={onViewSeller}
                isExpanded={expandedId === batch.id}
                isHighlighted={lastExpandedId === batch.id}
                onToggle={() => handleToggle(batch.id)}
              />
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
}
