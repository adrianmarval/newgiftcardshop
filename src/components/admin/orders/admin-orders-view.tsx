'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminOrdersFilters } from './admin-orders-filters';
import { AdminOrdersList } from './admin-orders-list';
import { AdminReportDialog } from './admin-report-dialog';
import { AdminBuyerDialog } from './admin-buyer-dialog';
import { StatusLegend } from '@/components/common';
import type { Giftcard } from '@/types';
import type { AdminOrder, PaginationMeta } from '@/types';

interface AdminOrdersViewProps {
  orders: AdminOrder[];
  buyers: Array<{ id: string; name: string; email: string }>;
  pagination: PaginationMeta;
}

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

  const handleAddReport = (card: Giftcard) => {
    const order = orders.find((o) => o.giftcards.some((g) => g.id === card.id));
    if (order) {
      setReportDialog({ card, mode: 'ADD', orderId: order.id });
    }
  };

  const handleEditReport = (card: Giftcard) => {
    const order = orders.find((o) => o.giftcards.some((g) => g.id === card.id));
    if (order) {
      setReportDialog({ card, mode: 'EDIT', orderId: order.id });
    }
  };

  const handleDeleteReport = (card: Giftcard) => {
    const order = orders.find((o) => o.giftcards.some((g) => g.id === card.id));
    if (order) {
      setReportDialog({ card, mode: 'DELETE', orderId: order.id });
    }
  };

  const handleViewBuyer = (order: AdminOrder) => {
    setBuyerDialog({ buyer: order.buyer });
  };

  const handleReportSuccess = () => {
    router.refresh();
  };

  return (
    <div className="space-y-1">
      <StatusLegend />
      <AdminOrdersFilters buyers={buyers} />
      <AdminOrdersList
        orders={orders}
        totalPages={pagination.totalPages}
        onViewBuyer={handleViewBuyer}
        onAddReport={handleAddReport}
        onEditReport={handleEditReport}
        onDeleteReport={handleDeleteReport}
      />
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
