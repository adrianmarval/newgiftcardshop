'use client';

import { OrdersList } from './orders-list';
import { UrlPagination } from '@/components/ui/url-pagination';
import { FiltersBar } from '@/components/common';
import { orderSearchParamsParsers } from '@/lib/search-params';
import type { BuyerOrder, PaginationMeta } from '@/types';

export interface BuyerOrdersViewProps {
  orders: BuyerOrder[];
  pagination: PaginationMeta;
  search?: string;
}

const FILTERS_DEFAULTS = {
  status: 'ALL',
  search: '',
  sort: 'newest',
};

export const BuyerOrdersView = ({ orders, pagination, search }: BuyerOrdersViewProps) => {
  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <div data-tour="orders-filters">
        <FiltersBar
          parsers={orderSearchParamsParsers}
          defaults={FILTERS_DEFAULTS}
          config={{
            search: { placeholder: 'Buscar orden...', paramKey: 'search' },
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
            sort: {
              label: 'Orden',
              paramKey: 'sort',
              options: [
                { value: 'newest', label: 'Mas nuevas' },
                { value: 'oldest', label: 'Mas viejas' },
              ],
            },
          }}
        />
      </div>
      <div data-tour="orders-list" className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        <OrdersList orders={orders} totalPages={pagination.totalPages} search={search} />
      </div>
      <div className="shrink-0">
        <UrlPagination totalPages={pagination.totalPages} />
      </div>
    </div>
  );
};