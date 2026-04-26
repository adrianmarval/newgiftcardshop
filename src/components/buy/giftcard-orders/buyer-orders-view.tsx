'use client';

import { OrdersFilters } from '@/components/buy/giftcard-orders/orders-filters';
import { OrdersList } from '@/components/buy/giftcard-orders/orders-list';
import type { BuyerOrdersViewProps } from './types';
import { StatusLeyend } from '@/components/ui/status-leyend';

export const BuyerOrdersView = ({ orders, pagination }: BuyerOrdersViewProps) => {
  return (
    <div className="space-y-4">
      <StatusLeyend />
      <OrdersFilters />
      <OrdersList orders={orders} totalPages={pagination.totalPages} />
    </div>
  );
};
