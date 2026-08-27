'use client';

import { RegistryList } from '@/components/common';
import { OrderCard } from './order-card';
import type { BuyerOrder } from '@/types';

export interface OrdersListProps {
  orders: BuyerOrder[];
  totalPages: number;
  search?: string;
}

export const OrdersList = ({ orders, search }: OrdersListProps) => {
  return (
    <RegistryList
      items={orders}
      getId={(o) => o.id}
      getMatch={(o) => {
        if (o.giftcards.some((g) => g.isSearchMatch)) return o.id;
        if (search && o.id === search) return o.id;
        return null;
      }}
      renderItem={(order, { isExpanded, isHighlighted, onToggle }) => (
        <div data-tour={order.id === orders[0]?.id ? 'order-card' : undefined}>
          <OrderCard
            order={order}
            isExpanded={isExpanded}
            isHighlighted={isHighlighted}
            onToggle={onToggle}
          />
        </div>
      )}
    />
  );
};