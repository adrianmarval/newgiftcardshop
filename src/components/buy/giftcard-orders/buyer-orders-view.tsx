'use client';

import { OrdersFilters } from '@/components/buy/giftcard-orders/orders-filters';
import { OrdersList } from '@/components/buy/giftcard-orders/orders-list';
import { StatusLegend } from '@/components/ui/status-legend';
import { BuyerOrder, PaginationMeta } from '@/types';

export interface BuyerOrdersViewProps {
  orders: BuyerOrder[];
  pagination: PaginationMeta;
}

export const BuyerOrdersView = ({ orders, pagination }: BuyerOrdersViewProps) => {
  return (
    <div className="space-y-1">
      <StatusLegend />
      <OrdersFilters />
      <OrdersList orders={orders} totalPages={pagination.totalPages} />
    </div>
  );
};
