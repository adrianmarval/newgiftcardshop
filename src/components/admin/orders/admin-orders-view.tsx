'use client';

import { useState } from 'react';
import { AdminOrdersFilters } from '@/components/admin/orders/admin-orders-filters';
import { AdminOrdersList } from '@/components/admin/orders/admin-orders-list';
import { AdminReportDialog } from '@/components/admin/orders/admin-report-dialog';
import { AdminBuyerDialog } from '@/components/admin/orders/admin-buyer-dialog';
import { CardDetailDialog } from '@/components/buy/giftcard-orders/card-detail-dialog';
import { StatusLeyend } from '@/components/ui/status-leyend';
import type { AdminOrdersViewProps } from './types';
import type { Giftcard } from '@/types/domain/giftcard';
import type { OrderStatus } from '@/types/domain/order';
import type { AdminOrder } from '@/types/domain/admin';

export const AdminOrdersView = ({ orders, buyers, pagination }: AdminOrdersViewProps) => {
  const [selectedCard, setSelectedCard] = useState<{
    card: Giftcard;
    orderStatus: OrderStatus;
  } | null>(null);

  const [reportDialog, setReportDialog] = useState<{
    card: Giftcard | null;
    mode: 'ADD' | 'EDIT' | 'DELETE' | null;
    orderId: string | null;
  }>({ card: null, mode: null, orderId: null });

  const [buyerDialog, setBuyerDialog] = useState<{
    buyer: AdminOrdersViewProps['orders'][0]['buyer'] | null;
  }>({ buyer: null });

  const handleCardClick = (card: Giftcard, orderStatus: OrderStatus) => {
    setSelectedCard({ card, orderStatus });
  };

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

  return (
    <div className="space-y-4">
      <StatusLeyend />
      <AdminOrdersFilters buyers={buyers} />
      <AdminOrdersList
        orders={orders}
        totalPages={pagination.totalPages}
        onCardClick={handleCardClick}
        onViewBuyer={handleViewBuyer}
        onAddReport={handleAddReport}
        onEditReport={handleEditReport}
        onDeleteReport={handleDeleteReport}
      />
      <CardDetailDialog
        card={selectedCard?.card ?? null}
        orderStatus={selectedCard?.orderStatus ?? null}
        open={!!selectedCard}
        onOpenChange={(open) => {
          if (!open) setSelectedCard(null);
        }}
      />
      <AdminReportDialog
        card={reportDialog.card}
        orderId={reportDialog.orderId}
        mode={reportDialog.mode}
        open={!!reportDialog.card}
        onOpenChange={(open) => {
          if (!open) setReportDialog({ card: null, mode: null, orderId: null });
        }}
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
