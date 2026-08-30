'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AdminWithdrawDialog } from './admin-withdraw-dialog';

/**
 * Botón de retiro para la card "Balance Binance" del admin dashboard.
 * Self-contained: el diálogo self-fetchea balances e info del destino al abrirse.
 */
export const AdminWithdrawButton = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Retirar Fondos
      </Button>
      <AdminWithdrawDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
};
