'use client';

import { PaginationMeta, SellerBatch } from '@/types';
import { BatchesFilters } from './batches-filters';
import { BatchesList } from './batches-list';
import { StatusLegend } from '@/components/ui/status-legend';

export interface SellerBatchesViewProps {
  batches: SellerBatch[];
  pagination?: PaginationMeta;
}

export function SellerBatchesView({ batches, pagination }: SellerBatchesViewProps) {
  return (
    <div className="space-y-1">
      <StatusLegend language="en" />
      <BatchesFilters />
      <BatchesList batches={batches} totalPages={pagination?.totalPages} />
    </div>
  );
}
