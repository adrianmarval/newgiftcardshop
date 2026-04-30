'use client';

import { useState } from 'react';
import { createRefund } from '@/actions/admin/admin-create-refund';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminRefundDialogProps } from './types';

export const AdminRefundDialog = ({ open, onOpenChange, sellers, buyers, onSuccess }: AdminRefundDialogProps) => {
  const [refundType, setRefundType] = useState<'BUYER' | 'SELLER'>('BUYER');
  const [amount, setAmount] = useState('');
  const [userId, setUserId] = useState('');
  const [referenceType, setReferenceType] = useState<'ORDER' | 'BATCH'>('ORDER');
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await createRefund({
        amount: parseFloat(amount),
        refundType,
        relatedUserId: userId,
        referenceType,
        referenceId,
        notes: notes || undefined,
      });

      if (result.data?.success) {
        setAmount('');
        setUserId('');
        setReferenceId('');
        setNotes('');
        onSuccess();
      } else {
        setError('Error al crear el refund');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el refund');
    } finally {
      setIsLoading(false);
    }
  };

  const users = refundType === 'BUYER' ? buyers : sellers;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Refund</DialogTitle>
          <DialogDescription>Registrar un reembolso a buyer o seller.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded bg-red-100 p-2 text-sm text-red-600">{error}</p>}

          <div>
            <label className="mb-1 block text-sm font-medium">Tipo de Refund</label>
            <select
              value={refundType}
              onChange={(e) => {
                setRefundType(e.target.value as 'BUYER' | 'SELLER');
                setUserId('');
              }}
              className="bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            >
              <option value="BUYER">Refund a Buyer</option>
              <option value="SELLER">Refund a Seller</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{refundType === 'BUYER' ? 'Buyer' : 'Seller'}</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              className="bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            >
              <option value="">Seleccionar...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

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
            <label className="mb-1 block text-sm font-medium">Referencia</label>
            <div className="flex gap-2">
              <select
                value={referenceType}
                onChange={(e) => setReferenceType(e.target.value as 'ORDER' | 'BATCH')}
                className="bg-background focus:ring-ring rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              >
                <option value="ORDER">Order</option>
                <option value="BATCH">Batch</option>
              </select>
              <Input
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="ID de la orden o batch"
                required
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo del refund..."
              rows={3}
              className="bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Registrando...' : 'Registrar Refund'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
