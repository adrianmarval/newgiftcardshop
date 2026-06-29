'use client';

import { RegistryList } from '@/components/common';
import { OrderCard } from './order-card';
import type { BuyerOrder } from '@/types';

export interface OrdersListProps {
  orders: BuyerOrder[];
  totalPages: number;
}

export const OrdersList = ({ orders }: OrdersListProps) => {
  return (
    <RegistryList
      items={orders}
      getId={(o) => o.id}
      getMatch={(o) => o.giftcards.some((g) => g.isSearchMatch) ? o.id : null}
      renderItem={(order, { isExpanded, isHighlighted, onToggle }) => (
        <OrderCard
          order={order}
          isExpanded={isExpanded}
          isHighlighted={isHighlighted}
          onToggle={onToggle}
        />
      )}
    />
  );
};