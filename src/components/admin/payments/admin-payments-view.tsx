'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminPaymentsFilters } from '@/components/admin/payments/admin-payments-filters';
import { AdminPaymentsList } from '@/components/admin/payments/admin-payments-list';
import { AdminDepositDialog } from '@/components/admin/payments/admin-deposit-dialog';
import { AdminRefundDialog } from '@/components/admin/payments/admin-refund-dialog';
import type { AdminPaymentsViewProps } from './types';
import { Button } from '@/components/ui/button';

export const AdminPaymentsView = ({ payments, pagination, sellers, buyers }: AdminPaymentsViewProps) => {
  const router = useRouter();
  const [depositOpen, setDepositOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  const handleSuccess = () => {
    router.refresh();
    setDepositOpen(false);
    setRefundOpen(false);
  };

  return (
    <div className="space-y-4">
      <AdminPaymentsFilters sellers={sellers} buyers={buyers} />
      <AdminPaymentsList payments={payments} totalPages={pagination.totalPages} />
      <div className="flex gap-2">
        <Button onClick={() => setDepositOpen(true)}>+ Registrar Depósito</Button>
        <Button variant={'secondary'} onClick={() => setRefundOpen(true)}>
          + Registrar Refund
        </Button>
      </div>
      <AdminDepositDialog open={depositOpen} onOpenChange={setDepositOpen} onSuccess={handleSuccess} />
      <AdminRefundDialog open={refundOpen} onOpenChange={setRefundOpen} sellers={sellers} buyers={buyers} onSuccess={handleSuccess} />
    </div>
  );
};
