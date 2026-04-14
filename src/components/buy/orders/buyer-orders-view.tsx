'use client';

import { useState } from 'react';
import { OrdersStats } from '@/components/buy/orders/orders-stats';
import { OrdersFilters } from '@/components/buy/orders/orders-filters';
import { OrdersList } from '@/components/buy/orders/orders-list';
import { CardDetailDialog } from '@/components/buy/orders/card-detail-dialog';
import type { Giftcard, OrderStatus } from '@/types';
import type { BuyerOrdersViewProps } from './types';

export const BuyerOrdersView = ({ orders, pagination }: BuyerOrdersViewProps) => {
  const [selectedCard, setSelectedCard] = useState<{
    card: Giftcard;
    orderStatus: OrderStatus;
  } | null>(null);

  const handleCardClick = (card: Giftcard, orderStatus: OrderStatus) => {
    setSelectedCard({ card, orderStatus });
  };

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Header & Stats Section */}
      <OrdersStats orders={orders} totalCount={pagination.totalCount} />

      {/* 2. Filters & Actions */}
      <OrdersFilters />

      {/* 3. Order List */}
      <OrdersList orders={orders} totalPages={pagination.totalPages} onCardClick={handleCardClick} />

      {/* 4. Details Dialog */}
      <CardDetailDialog
        card={selectedCard?.card ?? null}
        orderStatus={selectedCard?.orderStatus ?? null}
        open={!!selectedCard}
        onOpenChange={(open) => {
          if (!open) setSelectedCard(null);
        }}
      />
    </div>
  );
};
