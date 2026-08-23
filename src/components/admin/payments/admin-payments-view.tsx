'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryStates, debounce } from 'nuqs';
import { Check, ChevronsUpDown, Loader2, RefreshCw } from 'lucide-react';
import { showAlert } from '@/lib/ui';
import { AdminPaymentsList } from './admin-payments-list';
import { AdminDepositDialog } from './admin-deposit-dialog';
import { AdminRefundDialog } from './admin-refund-dialog';
import { Button } from '@/components/ui/button';
import { UrlPagination } from '@/components/ui/url-pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { FiltersBar } from '@/components/common';
import { adminPaymentsSearchParamsParsers } from '@/lib/search-params';
import { syncPendingWithdrawals } from '@/actions/admin/binance';
import { useAction } from 'next-safe-action/hooks';
import { cn } from '@/lib/ui';
import type { Payment, PaginationMeta } from '@/types';

interface AdminPaymentsViewProps {
  payments: Payment[];
  pagination: PaginationMeta;
  sellers: Array<{ id: string; name: string; email: string }>;
  buyers: Array<{ id: string; name: string; email: string }>;
  admins: Array<{ id: string; name: string; email: string }>;
}

const FILTERS_DEFAULTS = {
  direction: 'ALL',
  category: 'ALL',
  userId: '',
  search: '',
  dateFrom: '',
  dateTo: '',
};

// Inline user combobox grouped by Sellers / Buyers — only used in payments.
function UserGroupedCombobox({
  sellers,
  buyers,
}: {
  sellers: AdminPaymentsViewProps['sellers'];
  buyers: AdminPaymentsViewProps['buyers'];
}) {
  const [params, setParams] = useQueryStates(
    {
      userId: adminPaymentsSearchParamsParsers.userId,
    },
    { shallow: false, limitUrlUpdates: debounce(400) },
  );
  const [open, setOpen] = useState(false);
  const selectedId = params.userId || '';
  const selectedUser = [...sellers, ...buyers].find((u) => u.id === selectedId);

  return (
    <div className="flex flex-col space-y-1">
      <Label className="text-xs">Usuario</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-8 w-full justify-between text-xs font-normal md:h-9 md:text-sm"
          >
            {selectedUser ? selectedUser.name : 'Todos los usuarios'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-70 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar usuario..." />
            <CommandList>
              <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="ALL"
                  onSelect={() => {
                    setParams({ userId: '' });
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', !selectedId ? 'opacity-100' : 'opacity-0')} />
                  Todos los usuarios
                </CommandItem>
              </CommandGroup>
              {sellers.length > 0 && (
                <CommandGroup heading="Sellers">
                  {sellers.map((s) => (
                    <CommandItem
                      key={s.id}
                      value={`${s.name} ${s.email}`}
                      onSelect={() => {
                        setParams({ userId: s.id });
                        setOpen(false);
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', selectedId === s.id ? 'opacity-100' : 'opacity-0')} />
                      {s.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {buyers.length > 0 && (
                <CommandGroup heading="Buyers">
                  {buyers.map((b) => (
                    <CommandItem
                      key={b.id}
                      value={`${b.name} ${b.email}`}
                      onSelect={() => {
                        setParams({ userId: b.id });
                        setOpen(false);
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', selectedId === b.id ? 'opacity-100' : 'opacity-0')} />
                      {b.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export const AdminPaymentsView = ({ payments, pagination, sellers, buyers }: AdminPaymentsViewProps) => {
  const router = useRouter();
  const [depositOpen, setDepositOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  const handleSuccess = () => {
    router.refresh();
    setDepositOpen(false);
    setRefundOpen(false);
  };

  const { execute: syncWithdrawals, isExecuting: isSyncing } = useAction(syncPendingWithdrawals, {
    onSuccess: ({ data }) => {
      if (data?.total === 0) {
        showAlert.toast.info('Sin pendientes', 'No hay retiros pendientes para sincronizar.');
        return;
      }

      showAlert.custom(
        'success',
        'Sincronización Exitosa',
        <div className="space-y-1 text-left">
          <p>
            Total procesados: <b>{data?.total}</b>
          </p>
          <p>
            Resueltos (Éxito): <b className="text-emerald-400">{data?.resolved}</b>
          </p>
          <p>
            Fallidos: <b className="text-red-400">{data?.failed}</b>
          </p>
          <p>
            Siguen pendientes: <b>{data?.stillPending}</b>
          </p>
        </div>,
      );
      router.refresh();
    },
    onError: () => {
      showAlert.error('Error de Sincronización', 'Hubo un problema al conectar con Binance o actualizar la DB.');
    },
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <FiltersBar
        parsers={adminPaymentsSearchParamsParsers}
        defaults={FILTERS_DEFAULTS}
        customContent={<UserGroupedCombobox sellers={sellers} buyers={buyers} />}
        config={{
          search: { placeholder: 'Buscar por ID, tx Binance...', paramKey: 'search' },
          status: {
            label: 'Dirección',
            paramKey: 'direction',
            options: [
              { value: 'ALL', label: 'Todos' },
              { value: 'CREDIT', label: 'Ingresos (CREDIT)' },
              { value: 'DEBIT', label: 'Egresos (DEBIT)' },
            ],
          },
          sort: {
            label: 'Categoría',
            paramKey: 'category',
            options: [
              { value: 'ALL', label: 'Todas' },
              { value: 'ORDER', label: 'Orden' },
              { value: 'BATCH', label: 'Batch' },
              { value: 'DEPOSIT', label: 'Depósito' },
              { value: 'REFUND_BUYER', label: 'Refund Buyer' },
              { value: 'REFUND_SELLER', label: 'Refund Seller' },
            ],
          },
          dateRange: { fromParamKey: 'dateFrom', toParamKey: 'dateTo' },
        }}
      />
      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        <AdminPaymentsList payments={payments} totalPages={pagination.totalPages} />
      </div>
      <div className="shrink-0">
        <UrlPagination totalPages={pagination.totalPages} />
      </div>
      <div className="flex gap-1">
        <Button onClick={() => setDepositOpen(true)}>+ Registrar Depósito</Button>
        <Button variant={'secondary'} onClick={() => setRefundOpen(true)}>
          + Registrar Refund
        </Button>
        <Button variant={'outline'} onClick={() => syncWithdrawals()} disabled={isSyncing}>
          {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Sincronizar Binance
        </Button>
      </div>
      <AdminDepositDialog open={depositOpen} onOpenChange={setDepositOpen} onSuccess={handleSuccess} />
      <AdminRefundDialog open={refundOpen} onOpenChange={setRefundOpen} sellers={sellers} buyers={buyers} onSuccess={handleSuccess} />
    </div>
  );
};