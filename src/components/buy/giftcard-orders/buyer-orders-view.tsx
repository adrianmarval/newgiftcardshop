'use client';

import { useState } from 'react';
import { OrdersStats } from '@/components/buy/giftcard-orders/orders-stats';
import { OrdersFilters } from '@/components/buy/giftcard-orders/orders-filters';
import { OrdersList } from '@/components/buy/giftcard-orders/orders-list';
import { CardDetailDialog } from '@/components/buy/giftcard-orders/card-detail-dialog';
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
    <div className="space-y-2">
      <OrdersStats orders={orders} totalCount={pagination.totalCount} />
      <OrdersFilters />
      <OrdersList orders={orders} totalPages={pagination.totalPages} onCardClick={handleCardClick} />
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
