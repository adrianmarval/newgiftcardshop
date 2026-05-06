'use client';

import { useState } from 'react';
import { createDeposit } from '@/actions/admin/admin-create-deposit';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminDepositDialogProps } from './types';

export const AdminDepositDialog = ({ open, onOpenChange, onSuccess }: Omit<AdminDepositDialogProps, 'admins'>) => {
  const [amount, setAmount] = useState('');

  const [binanceTxId, setBinanceTxId] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await createDeposit({
        amount: parseFloat(amount),
        binanceTxId: binanceTxId || undefined,
        notes: notes || undefined,
      });

      if (result.data?.success) {
        setAmount('');

        setBinanceTxId('');
        setNotes('');
        onSuccess();
      } else {
        setError('Error al crear el depósito');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el depósito');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Depósito</DialogTitle>
          <DialogDescription>Registrar el ingreso de dinero por parte de un administrador a la plataforma.</DialogDescription>
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

          <div>
            <label className="mb-1 block text-sm font-medium">Tx ID Binance (opcional)</label>
            <Input value={binanceTxId} onChange={(e) => setBinanceTxId(e.target.value)} placeholder="ID de transacción en Binance" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo del depósito..."
              rows={3}
              className="bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Registrando...' : 'Registrar Depósito'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
