'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminPaymentsFilters } from '@/components/admin/payments/admin-payments-filters';
import { AdminPaymentsList } from '@/components/admin/payments/admin-payments-list';
import { AdminDepositDialog } from '@/components/admin/payments/admin-deposit-dialog';
import { AdminRefundDialog } from '@/components/admin/payments/admin-refund-dialog';
import type { AdminPaymentsViewProps } from './types';
import { Button } from '@/components/ui/button';
import { syncPendingWithdrawalsAction } from '@/actions/admin/binance';
import { useAction } from 'next-safe-action/hooks';
import Swal from 'sweetalert2';
import { Loader2, RefreshCw } from 'lucide-react';

export const AdminPaymentsView = ({ payments, pagination, sellers, buyers }: AdminPaymentsViewProps) => {
  const router = useRouter();
  const [depositOpen, setDepositOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  const handleSuccess = () => {
    router.refresh();
    setDepositOpen(false);
    setRefundOpen(false);
  };

  const { execute: syncWithdrawals, isExecuting: isSyncing } = useAction(syncPendingWithdrawalsAction, {
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
    onError: (error) => {
      Swal.fire({
        title: 'Error de Sincronización',
        text: 'Hubo un problema al conectar con Binance o actualizar la DB.',
        icon: 'error',
      });
    },
  });

  return (
    <div className="space-y-4">
      <AdminPaymentsFilters sellers={sellers} buyers={buyers} />
      <AdminPaymentsList payments={payments} totalPages={pagination.totalPages} />
      <div className="flex gap-2">
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
