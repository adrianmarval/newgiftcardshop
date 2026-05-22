'use client';

import { useState } from 'react';
import { withdrawBalanceAction } from '@/actions/admin/binance';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AdminWithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AdminWithdrawDialog = ({ open, onOpenChange, onSuccess }: AdminWithdrawDialogProps) => {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await withdrawBalanceAction({
        amount: parseFloat(amount),
      });

      if (result?.data) {
        setAmount('');
        onSuccess();
      } else if (result?.serverError) {
        setError(result.serverError);
      } else {
        setError('Error al solicitar el retiro');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retirar Fondos (Binance)</DialogTitle>
          <DialogDescription>Retira USDT de la cuenta de Binance hacia la billetera configurada en tu entorno.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded bg-red-100 p-2 text-sm text-red-600">{error}</p>}

          <div>
            <label className="mb-1 block text-sm font-medium">Monto (USDT)</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Procesando...' : 'Retirar Fondos'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
