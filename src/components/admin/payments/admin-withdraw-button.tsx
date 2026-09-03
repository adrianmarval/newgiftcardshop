'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { AdminWithdrawDialog } from './admin-withdraw-dialog';

/**
 * Botón de retiro para la card "Balance Binance" del admin dashboard.
 * Self-contained: el diálogo self-fetchea balances e info del destino al abrirse.
 */
export const AdminWithdrawButton = () => {
  const queryClient = useQueryClient();
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
          // Feedback vía React Query — NUNCA router.refresh() (aborta navs en vuelo)
          void queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
          void queryClient.invalidateQueries({ queryKey: ['platform-balance'] });
          void queryClient.invalidateQueries({ queryKey: ['admin-binance-balance'] });
        }}
      />
    </>
  );
};
