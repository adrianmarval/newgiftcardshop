'use client';

import { useQueryStates } from 'nuqs';
import { FiltersBar } from '@/components/common';
import { UrlPagination } from '@/components/ui/url-pagination';
import { AdminIssuesList } from './admin-issues-list';
import { adminIssuesSearchParamsParsers, buildAdminIssuesInput } from '@/lib/search-params';
import { apiQuery } from '@/lib/utils';
import { useListQuery } from '@/hooks/use-list-query';
import type { AdminGiftcardIssue, PaginationMeta } from '@/types';

type AdminIssuesInput = ReturnType<typeof buildAdminIssuesInput>;
type AdminIssuesData = { success: true; items: AdminGiftcardIssue[]; pagination: PaginationMeta };

async function fetchAdminIssues(input: AdminIssuesInput) {
  return apiQuery<AdminIssuesData>('admin-issues', input);
}

interface AdminIssuesViewProps {
  issues: AdminGiftcardIssue[];
  pagination: PaginationMeta;
  /** Input exacto que usó el server page (para que el initialData aplique solo al primer paint). */
  initialInput: AdminIssuesInput;
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

export function AdminIssuesView({ issues, pagination, initialInput }: AdminIssuesViewProps) {
  const [params] = useQueryStates(adminIssuesSearchParamsParsers);
  const input = buildAdminIssuesInput(params);

  const { data } = useListQuery({
    queryKey: 'admin-issues',
    input,
    fetcher: fetchAdminIssues,
    initialInput,
    initialData: { success: true as const, items: issues, pagination },
  });
  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <FiltersBar
        parsers={adminIssuesSearchParamsParsers}
        defaults={FILTERS_DEFAULTS}
        config={{
          search: { placeholder: 'Buscar por orden, código, marca o comprador...', paramKey: 'search' },
          userComboboxes: [
            {
              label: 'Vendedor',
              paramKey: 'sellerId',
              role: 'SELLER',
              allLabel: 'Todos los vendedores',
              emptyLabel: 'No se encontraron vendedores.',
            },
            {
              label: 'Comprador',
              paramKey: 'buyerId',
              role: 'BUYER',
              allLabel: 'Todos los compradores',
              emptyLabel: 'No se encontraron compradores.',
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
        <AdminIssuesList issues={data.items} />
      </div>

      <div className="shrink-0">
        <UrlPagination totalPages={data.pagination.totalPages} />
      </div>
    </div>
  );
}
