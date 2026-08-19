'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminOrdersList } from './admin-orders-list';
import { AdminReportDialog } from './admin-report-dialog';
import { AdminBuyerDialog } from './admin-buyer-dialog';
import { UrlPagination } from '@/components/ui/url-pagination';
import { FiltersBar } from '@/components/common';
import { adminOrdersSearchParamsParsers } from '@/lib/search-params';
import type { Giftcard, AdminOrder, PaginationMeta } from '@/types';

interface AdminOrdersViewProps {
  orders: AdminOrder[];
  buyers: Array<{ id: string; name: string; email: string }>;
  pagination: PaginationMeta;
}

const FILTERS_DEFAULTS = {
  status: 'ALL',
  search: '',
  buyerId: '',
  dateFrom: '',
  dateTo: '',
};

export const AdminOrdersView = ({ orders, buyers, pagination }: AdminOrdersViewProps) => {
  const router = useRouter();
  const [reportDialog, setReportDialog] = useState<{
    card: Giftcard | null;
    mode: 'ADD' | 'EDIT' | 'DELETE' | null;
    orderId: string | null;
  }>({ card: null, mode: null, orderId: null });

  const [buyerDialog, setBuyerDialog] = useState<{
    buyer: AdminOrdersViewProps['orders'][0]['buyer'] | null;
  }>({ buyer: null });

  const findOrderForCard = (card: Giftcard) => orders.find((o) => o.giftcards.some((g) => g.id === card.id));

  const handleAddReport = (card: Giftcard) => {
    const order = findOrderForCard(card);
    if (order) setReportDialog({ card, mode: 'ADD', orderId: order.id });
  };

  const handleEditReport = (card: Giftcard) => {
    const order = findOrderForCard(card);
    if (order) setReportDialog({ card, mode: 'EDIT', orderId: order.id });
  };

  const handleDeleteReport = (card: Giftcard) => {
    const order = findOrderForCard(card);
    if (order) setReportDialog({ card, mode: 'DELETE', orderId: order.id });
  };

  const handleViewBuyer = (order: AdminOrder) => {
    setBuyerDialog({ buyer: order.buyer });
  };

  const handleReportSuccess = () => {
    router.refresh();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <FiltersBar
        parsers={adminOrdersSearchParamsParsers}
        defaults={FILTERS_DEFAULTS}
        config={{
          search: { placeholder: 'Buscar orden...', paramKey: 'search' },
          combobox: {
            label: 'Comprador',
            paramKey: 'buyerId',
            options: buyers,
            allLabel: 'Todos los compradores',
            emptyLabel: 'No se encontraron compradores.',
          },
          status: {
            label: 'Estado',
            paramKey: 'status',
            options: [
              { value: 'ALL', label: 'Todos' },
              { value: 'PENDING', label: 'Pendiente' },
              { value: 'AWAITING_PAYMENT', label: 'Esperando' },
              { value: 'COMPLETED', label: 'Completada' },
              { value: 'CANCELLED', label: 'Cancelada' },
            ],
          },
          dateRange: { fromParamKey: 'dateFrom', toParamKey: 'dateTo' },
        }}
      />
      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        <AdminOrdersList
          orders={orders}
          totalPages={pagination.totalPages}
          onViewBuyer={handleViewBuyer}
          onAddReport={handleAddReport}
          onEditReport={handleEditReport}
          onDeleteReport={handleDeleteReport}
        />
      </div>
      <div className="shrink-0">
        <UrlPagination totalPages={pagination.totalPages} />
      </div>
      <AdminReportDialog
        card={reportDialog.card}
        orderId={reportDialog.orderId}
        mode={reportDialog.mode}
        open={!!reportDialog.card}
        onOpenChange={(open) => {
          if (!open) setReportDialog({ card: null, mode: null, orderId: null });
        }}
        onSuccess={handleReportSuccess}
      />
      <AdminBuyerDialog
        buyer={buyerDialog.buyer}
        open={!!buyerDialog.buyer}
        onOpenChange={(open) => {
          if (!open) setBuyerDialog({ buyer: null });
        }}
      />
    </div>
  );
};