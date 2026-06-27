'use client';

import { OrdersFilters } from '@/components/buy/giftcard-orders/orders-filters';
import { OrdersList } from '@/components/buy/giftcard-orders/orders-list';
import { UrlPagination } from '@/components/ui/url-pagination';
import { StatusLegend } from '@/components/common';
import type { BuyerOrder, PaginationMeta } from '@/types';

export interface BuyerOrdersViewProps {
  orders: BuyerOrder[];
  pagination: PaginationMeta;
}

export const BuyerOrdersView = ({ orders, pagination }: BuyerOrdersViewProps) => {
  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <StatusLegend />
      <OrdersFilters />
      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        <OrdersList orders={orders} totalPages={pagination.totalPages} />
      </div>
      <div className="shrink-0">
        <UrlPagination totalPages={pagination.totalPages} />
      </div>
    </div>
  );
};
