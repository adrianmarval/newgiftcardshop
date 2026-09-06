'use client';

import { useState } from 'react';
import { useQueryStates } from 'nuqs';
import { useQueryClient } from '@tanstack/react-query';
import { AdminOrdersList } from './admin-orders-list';
import { AdminReportDialog } from './admin-report-dialog';
import { AdminBuyerDialog } from './admin-buyer-dialog';
import { AdminSellerDialog } from '@/components/admin/batches/admin-seller-dialog';
import { UrlPagination } from '@/components/ui/url-pagination';
import { FiltersBar } from '@/components/common';
import { adminOrdersSearchParamsParsers, buildAdminOrdersInput } from '@/lib/search-params';
import { apiQuery } from '@/lib/utils';
import { useListQuery } from '@/hooks/use-list-query';
import type { Giftcard, AdminOrder, PaginationMeta, AdminBuyerSummary, AdminSellerSummary } from '@/types';

type AdminOrdersInput = ReturnType<typeof buildAdminOrdersInput>;
type AdminOrdersData = { success: true; items: AdminOrder[]; pagination: PaginationMeta };

async function fetchAdminOrders(input: AdminOrdersInput) {
  return apiQuery<AdminOrdersData>('admin-orders', input);
}

interface AdminOrdersViewProps {
  orders: AdminOrder[];
  pagination: PaginationMeta;
  /** Input exacto que usó el server page (para que el initialData aplique solo al primer paint). */
  initialInput: AdminOrdersInput;
}

const FILTERS_DEFAULTS = {
  status: 'ALL',
  search: '',
  buyerId: '',
  dateFrom: '',
  dateTo: '',
};

export const AdminOrdersView = ({ orders, pagination, initialInput }: AdminOrdersViewProps) => {
  const queryClient = useQueryClient();
  const [params] = useQueryStates(adminOrdersSearchParamsParsers);
  const input = buildAdminOrdersInput(params);

  const { data } = useListQuery({
    queryKey: 'admin-orders',
    input,
    fetcher: fetchAdminOrders,
    initialInput,
    initialData: { success: true as const, items: orders, pagination },
  });

  const items = data.items;
  const paginationMeta = data.pagination;

  const [reportDialog, setReportDialog] = useState<{
    card: Giftcard | null;
    mode: 'ADD' | 'EDIT' | 'DELETE' | null;
    orderId: string | null;
  }>({ card: null, mode: null, orderId: null });

  const [buyerDialog, setBuyerDialog] = useState<{ buyer: AdminBuyerSummary | null }>({ buyer: null });
  const [sellerDialog, setSellerDialog] = useState<{ seller: AdminSellerSummary | null }>({ seller: null });

  const findOrderForCard = (card: Giftcard) => items.find((o) => o.giftcards.some((g) => g.id === card.id));

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

  const handleViewBuyer = (buyer: AdminBuyerSummary) => {
    setBuyerDialog({ buyer });
  };

  const handleViewSeller = (seller: AdminSellerSummary) => {
    setSellerDialog({ seller });
  };

  const handleReportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <FiltersBar
        parsers={adminOrdersSearchParamsParsers}
        defaults={FILTERS_DEFAULTS}
        config={{
          search: { placeholder: 'Buscar orden...', paramKey: 'search' },
          userComboboxes: [
            {
              label: 'Comprador',
              paramKey: 'buyerId',
              role: 'BUYER',
              allLabel: 'Todos los compradores',
              emptyLabel: 'No se encontraron compradores.',
            },
          ],
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
          orders={items}
          totalPages={paginationMeta.totalPages}
          onViewBuyer={handleViewBuyer}
          onViewSeller={handleViewSeller}
          onAddReport={handleAddReport}
          onEditReport={handleEditReport}
          onDeleteReport={handleDeleteReport}
        />
      </div>
      <div className="shrink-0">
        <UrlPagination totalPages={paginationMeta.totalPages} />
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
      <AdminSellerDialog
        seller={sellerDialog.seller}
        open={!!sellerDialog.seller}
        onOpenChange={(open) => {
          if (!open) setSellerDialog({ seller: null });
        }}
      />
    </div>
  );
};
