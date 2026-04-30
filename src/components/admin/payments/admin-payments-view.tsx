'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminPaymentsFilters } from '@/components/admin/payments/admin-payments-filters';
import { AdminPaymentsList } from '@/components/admin/payments/admin-payments-list';
import { AdminDepositDialog } from '@/components/admin/payments/admin-deposit-dialog';
import { AdminRefundDialog } from '@/components/admin/payments/admin-refund-dialog';
import type { AdminPaymentsViewProps } from './types';

export const AdminPaymentsView = ({ payments, pagination, sellers, buyers, admins }: AdminPaymentsViewProps) => {
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
        <button onClick={() => setDepositOpen(true)} className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700">
          + Registrar Depósito
        </button>
        <button onClick={() => setRefundOpen(true)} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          + Registrar Refund
        </button>
      </div>
      <AdminDepositDialog open={depositOpen} onOpenChange={setDepositOpen} admins={admins} onSuccess={handleSuccess} />
      <AdminRefundDialog open={refundOpen} onOpenChange={setRefundOpen} sellers={sellers} buyers={buyers} onSuccess={handleSuccess} />
    </div>
  );
};
