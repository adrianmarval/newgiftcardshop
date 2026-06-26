'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AdminBatchesFilters } from './admin-batches-filters';
import { AdminBatchesList } from './admin-batches-list';
import { AdminPayDialog } from './admin-pay-dialog';
import { AdminSellerDialog } from './admin-seller-dialog';
import type { AdminBatch, PaginationMeta } from '@/types';
import { IconCurrencyDollar } from '@tabler/icons-react';
import { StatusLegend } from '@/components/common';

interface AdminBatchesClientProps {
  batches: AdminBatch[];
  sellers: Array<{ id: string; name: string }>;
  pagination: PaginationMeta;
}

export function AdminBatchesView({ batches, sellers, pagination }: AdminBatchesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [sellerDialog, setSellerDialog] = useState<{
    seller: {
      id: string;
      name: string;
      email: string;
      sellRate: number;
      orderCount: number;
      createdAt: string;
      twoFactorEnabled: boolean;
    } | null;
  }>({ seller: null });

  const selectedBatches = batches.filter((b) => selectedIds.has(b.id) && !b.isPaid && b.confirmedCount === b.cardsCount);
  const showFloatingBar = useMemo(() => selectedBatches.length > 0, [selectedBatches.length]);

  const handleSelect = (id: number, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleViewSeller = (batch: AdminBatch) => {
    setSellerDialog({ seller: batch.seller });
  };

  const currentPage = parseInt(searchParams.get('page') || '1');

  const handlePageChange = useCallback((newPage: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', newPage.toString());
    window.location.href = url.toString();
  }, []);

  const handleDeleted = () => {
    router.refresh();
  };

  const handlePaid = () => {
    setSelectedIds(new Set());
    router.refresh();
  };

  return (
    <div className="space-y-1">
      <StatusLegend />

      <AdminBatchesFilters sellers={sellers} />

      <AdminBatchesList
        batches={batches}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onDeleted={handleDeleted}
        onViewSeller={handleViewSeller}
      />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
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

      <AdminSellerDialog
        seller={sellerDialog.seller}
        open={!!sellerDialog.seller}
        onOpenChange={(open) => {
          if (!open) setSellerDialog({ seller: null });
        }}
      />

      {showFloatingBar && (
        <div className="bg-card border-border fixed bottom-22 left-1/2 z-9999 flex -translate-x-1/2 items-center gap-1 rounded-full border px-4 py-2 shadow-lg">
          <span className="text-sm font-medium">
            {selectedBatches.length} lote{selectedBatches.length > 1 ? 's' : ''} seleccionado{selectedBatches.length > 1 ? 's' : ''}
          </span>
          <Button onClick={() => setPayDialogOpen(true)} size="sm" className="gap-1">
            <IconCurrencyDollar className="h-4 w-4" />
            Pagar ${selectedBatches.reduce((s, b) => s + b.estimatedPayout, 0).toFixed(2)}
          </Button>
        </div>
      )}
    </div>
  );
}
