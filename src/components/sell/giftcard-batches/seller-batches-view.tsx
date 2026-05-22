'use client';

import { PaginationMeta, SellerBatch } from '@/types';
import { BatchesFilters } from './batches-filters';
import { BatchesList } from './batches-list';
import { StatusLeyend } from '@/components/ui/status-leyend';

export interface SellerBatchesViewProps {
  batches: SellerBatch[];
  pagination?: PaginationMeta;
}

export function SellerBatchesView({ batches, pagination }: SellerBatchesViewProps) {
  return (
    <div className="space-y-4">
      <StatusLeyend language="en" />
      <BatchesFilters />
      <BatchesList batches={batches} totalPages={pagination?.totalPages} />
    </div>
  );
}
