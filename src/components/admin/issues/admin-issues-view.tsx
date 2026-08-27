'use client';

import { FiltersBar } from '@/components/common';
import { UrlPagination } from '@/components/ui/url-pagination';
import { AdminIssuesList } from './admin-issues-list';
import { adminIssuesSearchParamsParsers } from '@/lib/search-params';
import type { AdminGiftcardIssue, PaginationMeta } from '@/types';

interface AdminIssuesViewProps {
  issues: AdminGiftcardIssue[];
  sellers: Array<{ id: string; name: string; email?: string }>;
  buyers: Array<{ id: string; name: string; email?: string }>;
  pagination: PaginationMeta;
}

const FILTERS_DEFAULTS = {
  issueType: 'ALL',
  search: '',
  sort: 'newest',
  sellerId: '',
  buyerId: '',
  dateFrom: '',
  dateTo: '',
};

export function AdminIssuesView({ issues, sellers, buyers, pagination }: AdminIssuesViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <FiltersBar
        parsers={adminIssuesSearchParamsParsers}
        defaults={FILTERS_DEFAULTS}
        config={{
          search: { placeholder: 'Buscar por orden, código, marca o comprador...', paramKey: 'search' },
          combobox: {
            label: 'Vendedor',
            paramKey: 'sellerId',
            options: sellers,
            allLabel: 'Todos los vendedores',
            emptyLabel: 'No se encontraron vendedores.',
          },
          selects: [
            {
              label: 'Comprador',
              paramKey: 'buyerId',
              options: [{ value: 'ALL', label: 'Todos los compradores' }, ...buyers.map((b) => ({ value: b.id, label: b.name }))],
            },
          ],
          status: {
            label: 'Tipo de problema',
            paramKey: 'issueType',
            options: [
              { value: 'ALL', label: 'Todos' },
              { value: 'INVALID', label: 'Inválida' },
              { value: 'ALREADY_USED', label: 'Ya usada' },
              { value: 'DEACTIVATED', label: 'Desactivada' },
              { value: 'WRONG_AMOUNT', label: 'Monto incorrecto' },
            ],
          },
          sort: {
            label: 'Ordenar por',
            paramKey: 'sort',
            options: [
              { value: 'newest', label: 'Más recientes' },
              { value: 'oldest', label: 'Más antiguos' },
            ],
          },
          dateRange: { fromParamKey: 'dateFrom', toParamKey: 'dateTo' },
        }}
      />

      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        <AdminIssuesList issues={issues} />
      </div>

      <div className="shrink-0">
        <UrlPagination totalPages={pagination.totalPages} />
      </div>
    </div>
  );
}
