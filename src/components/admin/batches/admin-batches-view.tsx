'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AdminBatchesFilters } from './admin-batches-filters';
import { AdminBatchesList } from './admin-batches-list';
import { AdminPayDialog } from './admin-pay-dialog';
import type { AdminBatch } from '@/types/domain/admin';
import type { PaginationMeta } from '@/types/application/shared';
import { IconCurrencyDollar } from '@tabler/icons-react';
import { AlertTriangle } from 'lucide-react';
import { StatusLeyend } from '@/components/ui/status-leyend';

interface AdminBatchesClientProps {
  batches: AdminBatch[];
  sellers: Array<{ id: string; name: string }>;
  pagination: PaginationMeta;
}

export function AdminBatchesView({ batches, sellers, pagination }: AdminBatchesClientProps) {
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [showFloatingBar, setShowFloatingBar] = useState(false);

  const selectedBatches = batches.filter((b) => selectedIds.has(b.id) && !b.isPaid && b.confirmedCount === b.cardsCount);

  useEffect(() => {
    setShowFloatingBar(selectedBatches.length > 0);
  }, [selectedBatches.length]);

  const handleSelect = (id: number, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const currentPage = parseInt(searchParams.get('page') || '1');

  const handlePageChange = useCallback((newPage: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', newPage.toString());
    window.location.href = url.toString();
  }, []);

  const handleDeleted = () => {
    window.location.reload();
  };

  const handlePaid = () => {
    setSelectedIds(new Set());
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      <StatusLeyend />

      <AdminBatchesFilters sellers={sellers} />

      <AdminBatchesList batches={batches} selectedIds={selectedIds} onSelect={handleSelect} onDeleted={handleDeleted} />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}>
            Anterior
          </Button>
          <span className="text-muted-foreground text-sm">
            Página {currentPage} de {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= pagination.totalPages}
          >
            Siguiente
          </Button>
        </div>
      )}

      <AdminPayDialog batches={selectedBatches} open={payDialogOpen} onOpenChange={setPayDialogOpen} onPaid={handlePaid} />

      {showFloatingBar && (
        <div className="bg-card border-border fixed bottom-22 left-1/2 z-9999 flex -translate-x-1/2 items-center gap-4 rounded-full border px-4 py-2 shadow-lg">
          <span className="text-sm font-medium">
            {selectedBatches.length} lote{selectedBatches.length > 1 ? 's' : ''} seleccionado{selectedBatches.length > 1 ? 's' : ''}
          </span>
          <Button onClick={() => setPayDialogOpen(true)} size="sm" className="gap-2">
            <IconCurrencyDollar className="h-4 w-4" />
            Pagar ${selectedBatches.reduce((s, b) => s + b.estimatedPayout, 0).toFixed(2)}
          </Button>
        </div>
      )}
    </div>
  );
}
