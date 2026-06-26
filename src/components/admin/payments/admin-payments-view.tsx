'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminPaymentsFilters } from '@/components/admin/payments/admin-payments-filters';
import { AdminPaymentsList } from '@/components/admin/payments/admin-payments-list';
import { AdminDepositDialog } from '@/components/admin/payments/admin-deposit-dialog';
import { AdminRefundDialog } from '@/components/admin/payments/admin-refund-dialog';
import { Button } from '@/components/ui/button';
import { syncPendingWithdrawals } from '@/actions/admin/binance';
import { useAction } from 'next-safe-action/hooks';
import Swal from 'sweetalert2';
import { Loader2, RefreshCw } from 'lucide-react';
import type { Payment, PaginationMeta } from '@/types';

interface AdminPaymentsViewProps {
  payments: Payment[];
  pagination: PaginationMeta;
  sellers: Array<{ id: string; name: string; email: string }>;
  buyers: Array<{ id: string; name: string; email: string }>;
  admins: Array<{ id: string; name: string; email: string }>;
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
        Swal.fire({
          title: 'Sin pendientes',
          text: 'No hay retiros pendientes para sincronizar.',
          icon: 'info',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }

      Swal.fire({
        title: 'Sincronización Exitosa',
        html: `
          <div class="text-left">
            <p>Total procesados: <b>${data?.total}</b></p>
            <p>Resueltos (Éxito): <b class="text-green-500">${data?.resolved}</b></p>
            <p>Fallidos: <b class="text-red-500">${data?.failed}</b></p>
            <p>Siguen pendientes: <b>${data?.stillPending}</b></p>
          </div>
        `,
        icon: 'success',
      });
      router.refresh();
    },
    onError: () => {
      Swal.fire({
        title: 'Error de Sincronización',
        text: 'Hubo un problema al conectar con Binance o actualizar la DB.',
        icon: 'error',
      });
    },
  });

  return (
    <div className="space-y-1">
      <AdminPaymentsFilters sellers={sellers} buyers={buyers} />
      <AdminPaymentsList payments={payments} totalPages={pagination.totalPages} />
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
