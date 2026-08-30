'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UrlPagination } from '@/components/ui/url-pagination';
import { AdminBatchesList } from './admin-batches-list';
import { AdminPayDialog } from './admin-pay-dialog';
import { AdminSellerDialog } from './admin-seller-dialog';
import { AdminBuyerDialog } from '@/components/admin/orders/admin-buyer-dialog';
import type { AdminBatch, AdminBuyerSummary, AdminSellerSummary, PaginationMeta } from '@/types';
import { IconCurrencyDollar } from '@tabler/icons-react';
import { formatCurrency } from '@/lib/utils';
import { FiltersBar } from '@/components/common';
import { adminBatchesSearchParamsParsers } from '@/lib/search-params';

interface AdminBatchesViewProps {
  batches: AdminBatch[];
  sellers: Array<{ id: string; name: string; email?: string }>;
  pagination: PaginationMeta;
}

const FILTERS_DEFAULTS = {
  status: 'ALL',
  search: '',
  sort: 'newest',
  sellerId: '',
};

export function AdminBatchesView({ batches, sellers, pagination }: AdminBatchesViewProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [sellerDialog, setSellerDialog] = useState<{ seller: AdminSellerSummary | null }>({ seller: null });
  const [buyerDialog, setBuyerDialog] = useState<{ buyer: AdminBuyerSummary | null }>({ buyer: null });

  const selectedBatches = batches.filter((b) => selectedIds.has(b.id) && !b.isPaid && b.confirmedCount === b.cardsCount && b.estimatedPayout > 0);
  const showFloatingBar = useMemo(() => selectedBatches.length > 0, [selectedBatches.length]);

  const handleSelect = (id: number, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleViewSeller = (seller: AdminSellerSummary) => {
    setSellerDialog({ seller });
  };

  const handleViewBuyer = (buyer: AdminBuyerSummary) => {
    setBuyerDialog({ buyer });
  };

  const handleDeleted = () => {
    router.refresh();
  };

  const handlePaid = () => {
    setSelectedIds(new Set());
    router.refresh();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <FiltersBar
        parsers={adminBatchesSearchParamsParsers}
        defaults={FILTERS_DEFAULTS}
        config={{
          search: { placeholder: 'Buscar por ID de lote o vendedor...', paramKey: 'search' },
          combobox: {
            label: 'Vendedor',
            paramKey: 'sellerId',
            options: sellers,
            allLabel: 'Todos los vendedores',
            emptyLabel: 'No se encontraron vendedores.',
          },
          status: {
            label: 'Estado',
            paramKey: 'status',
            options: [
              { value: 'ALL', label: 'Todos' },
              { value: 'PROCESSING', label: 'En proceso' },
              { value: 'CONFIRMED', label: 'Confirmado' },
              { value: 'PAID', label: 'Pagado' },
              { value: 'CANCELLED', label: 'Cancelado' },
              { value: 'WITH_ISSUES', label: 'Con problemas' },
            ],
          },
          sort: {
            label: 'Ordenar por',
            paramKey: 'sort',
            options: [
              { value: 'newest', label: 'Más recientes' },
              { value: 'oldest', label: 'Más antiguos' },
              { value: 'amount_high', label: 'Monto: Mayor a menor' },
              { value: 'amount_low', label: 'Monto: Menor a mayor' },
            ],
          },
        }}
      />

      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        <AdminBatchesList
          batches={batches}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onDeleted={handleDeleted}
          onViewSeller={handleViewSeller}
          onViewBuyer={handleViewBuyer}
        />
      </div>

      <div className="shrink-0">
        <UrlPagination totalPages={pagination.totalPages} />
      </div>

      <AdminPayDialog batches={selectedBatches} open={payDialogOpen} onOpenChange={setPayDialogOpen} onPaid={handlePaid} />

      <AdminSellerDialog
        seller={sellerDialog.seller}
        open={!!sellerDialog.seller}
        onOpenChange={(open) => {
          if (!open) setSellerDialog({ seller: null });
        }}
      />

      <AdminBuyerDialog
        buyer={buyerDialog.buyer}
        open={!!buyerDialog.buyer}
        onOpenChange={(open) => {
          if (!open) setBuyerDialog({ buyer: null });
        }}
      />

      {showFloatingBar && (
        <div className="bg-card border-border fixed bottom-22 left-1/2 z-9999 flex -translate-x-1/2 items-center gap-1 rounded-full border px-4 py-2 shadow-lg">
          <span className="text-sm font-medium">
            {selectedBatches.length} lote{selectedBatches.length > 1 ? 's' : ''} seleccionado{selectedBatches.length > 1 ? 's' : ''}
          </span>
          <Button onClick={() => setPayDialogOpen(true)} size="sm" className="gap-1">
            <IconCurrencyDollar className="h-4 w-4" />
            Pagar {formatCurrency(selectedBatches.reduce((s, b) => s + b.estimatedPayout, 0))}
          </Button>
        </div>
      )}
    </div>
  );
}