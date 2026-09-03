'use client';

import { useQueryStates } from 'nuqs';
import type { PaginationMeta, SellerBatch } from '@/types';
import { BatchesList } from './batches-list';
import { UrlPagination } from '@/components/ui/url-pagination';
import { FiltersBar } from '@/components/common';
import { sellerBatchesSearchParamsParsers, buildSellerBatchesInput } from '@/lib/search-params';
import { listBatches } from '@/actions/seller/batches';
import { useListQuery } from '@/hooks/use-list-query';

type SellerBatchesInput = ReturnType<typeof buildSellerBatchesInput>;

async function fetchSellerBatches(input: SellerBatchesInput) {
  const res = await listBatches(input);
  if (!res.data?.success) throw new Error('Failed to load batches');
  return res.data;
}

export interface SellerBatchesViewProps {
  batches: SellerBatch[];
  pagination?: PaginationMeta;
  search?: string;
  /** Input exacto que usó el server page (para que el initialData aplique solo al primer paint). */
  initialInput: SellerBatchesInput;
}

const FILTERS_DEFAULTS = {
  status: 'ALL',
  search: '',
  sort: 'newest',
};

export function SellerBatchesView({ batches, pagination, initialInput }: SellerBatchesViewProps) {
  const [params] = useQueryStates(sellerBatchesSearchParamsParsers);
  const input = buildSellerBatchesInput(params);

  const { data } = useListQuery({
    queryKey: 'seller-batches',
    input,
    fetcher: fetchSellerBatches,
    initialInput,
    initialData: { success: true as const, items: batches, pagination: pagination ?? { currentPage: 1, totalPages: 1, totalCount: batches.length } },
  });
  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <div data-tour="batches-filters">
        <FiltersBar
          parsers={sellerBatchesSearchParamsParsers}
          defaults={FILTERS_DEFAULTS}
          labels={{ filters: 'Filters', clear: 'Clear' }}
          config={{
          search: { placeholder: 'Search by claim code or batch id...', paramKey: 'search' },
          status: {
            label: 'Status',
            paramKey: 'status',
            options: [
              { value: 'ALL', label: 'All' },
              { value: 'PROCESSING', label: 'Processing' },
              { value: 'CONFIRMED', label: 'Confirmed' },
              { value: 'PAID', label: 'Paid' },
              { value: 'CANCELLED', label: 'Cancelled' },
              { value: 'REPORTED', label: 'Reported' },
            ],
          },
          sort: {
            label: 'Sort',
            paramKey: 'sort',
            options: [
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
            ],
          },
        }}
        />
      </div>
      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        <BatchesList batches={data.items} totalPages={data.pagination.totalPages} search={input.search} />
      </div>
      <div className="shrink-0">
        <UrlPagination totalPages={data.pagination.totalPages} />
      </div>
    </div>
  );
}