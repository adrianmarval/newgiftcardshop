'use client';

import { useQueryStates } from 'nuqs';
import { useQuery } from '@tanstack/react-query';
import { OrdersList } from './orders-list';
import { UrlPagination } from '@/components/ui/url-pagination';
import { FiltersBar } from '@/components/common';
import { orderSearchParamsParsers, buildBuyerOrdersInput } from '@/lib/search-params';
import { apiQuery } from '@/lib/utils';
import { useListQuery } from '@/hooks/use-list-query';
import type { BuyerOrder, OrderTabCounts, PaginationMeta } from '@/types';

type BuyerOrdersInput = ReturnType<typeof buildBuyerOrdersInput>;
type BuyerOrdersData = { success: true; items: BuyerOrder[]; pagination: PaginationMeta };

async function fetchBuyerOrders(input: BuyerOrdersInput) {
  return apiQuery<BuyerOrdersData>('buyer-orders', input);
}

export interface BuyerOrdersViewProps {
  orders: BuyerOrder[];
  pagination: PaginationMeta;
  search?: string;
  /** Input exacto que usó el server page (para que el initialData aplique solo al primer paint). */
  initialInput: BuyerOrdersInput;
}

const FILTERS_DEFAULTS = {
  status: 'ALL',
  search: '',
  sort: 'newest',
};

export const BuyerOrdersView = ({ orders, pagination, initialInput }: BuyerOrdersViewProps) => {
  const [params] = useQueryStates(orderSearchParamsParsers);
  const input = buildBuyerOrdersInput(params);

  const { data } = useListQuery({
    queryKey: 'buyer-orders',
    input,
    fetcher: fetchBuyerOrders,
    initialInput,
    initialData: { success: true as const, items: orders, pagination },
  });

  // Badges de los tabs (carga accionable total; se invalida via SSE con 'orders')
  const { data: tabCounts } = useQuery({
    queryKey: ['buyer-order-tab-counts'],
    queryFn: () => apiQuery<OrderTabCounts>('buyer-order-tab-counts'),
  });
  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <div data-tour="orders-filters">
        <FiltersBar
          parsers={orderSearchParamsParsers}
          defaults={FILTERS_DEFAULTS}
          config={{
            search: { placeholder: 'Buscar orden...', paramKey: 'search' },
            tabs: {
              paramKey: 'status',
              options: [
                { value: 'ALL', label: 'Todas' },
                { value: 'PENDING', label: 'Por confirmar' },
                { value: 'AWAITING_PAYMENT', label: 'Por pagar' },
              ],
              counts: tabCounts
                ? { PENDING: tabCounts.pending, AWAITING_PAYMENT: tabCounts.awaitingPayment }
                : undefined,
            },
            status: {
              label: 'Estado',
              paramKey: 'status',
              options: [
                { value: 'ALL', label: 'Todas' },
                { value: 'PENDING', label: 'Por confirmar' },
                { value: 'AWAITING_PAYMENT', label: 'Por pagar' },
                { value: 'COMPLETED', label: 'Completadas' },
                { value: 'CANCELLED', label: 'Canceladas' },
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
      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        <OrdersList orders={data.items} totalPages={data.pagination.totalPages} search={input.search} />
      </div>
      <div className="shrink-0">
        <UrlPagination totalPages={data.pagination.totalPages} />
      </div>
    </div>
  );
};