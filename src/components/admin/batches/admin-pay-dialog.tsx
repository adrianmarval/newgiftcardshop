'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { adminBatchPay } from '@/actions/admin/admin-batch-pay';
import { Spinner } from '@/components/ui/spinner';
import type { AdminBatch } from '@/types/domain/admin';

interface AdminPayDialogProps {
  batches: AdminBatch[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid: () => void;
}

export function AdminPayDialog({ batches, open, onOpenChange, onPaid }: AdminPayDialogProps) {
  const [isPaying, setIsPaying] = useState(false);

  const totalPayout = batches.reduce((sum, b) => sum + b.estimatedPayout, 0);

  const handlePay = async () => {
    setIsPaying(true);
    try {
      const result = await adminBatchPay({ batchIds: batches.map((b) => b.id) });
      if (result.serverError) {
        toast.error('Pago fallido', { description: result.serverError });
      } else if (!result.data?.success) {
        toast.error('Pago fallido', { description: 'Error desconocido' });
      } else {
        toast.success(`${batches.length} lote(s) pagado(s) exitosamente`);
        onOpenChange(false);
        onPaid();
      }
    } catch (error) {
      toast.error('Pago fallido', { description: error instanceof Error ? error.message : 'Error desconocido' });
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagar lotes</DialogTitle>
          <DialogDescription>
            Estás a punto de pagar {batches.length} lote{batches.length > 1 ? 's' : ''}. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {batches.map((batch) => (
            <div key={batch.id} className="flex items-center justify-between text-sm">
              <span>
                Lote #{batch.id} ({batch.seller.name})
              </span>
              <span className="font-medium">${batch.estimatedPayout.toFixed(2)}</span>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between border-t pt-2 font-semibold">
            <span>Total</span>
            <span>${totalPayout.toFixed(2)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPaying}>
            Cancelar
          </Button>
          <Button onClick={handlePay} disabled={isPaying}>
            {isPaying ? <Spinner size="sm" className="mr-2" /> : null}
            Pagar {batches.length} lote{batches.length > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
