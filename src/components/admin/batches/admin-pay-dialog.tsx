'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { InlineAlert } from '@/components/ui/inline-alert';
import { payBatch } from '@/actions/admin/batches';
import type { AdminBatch } from '@/types';
import type { AlertState } from '@/components/admin/types';
import { formatCurrency } from '@/lib/utils';

interface AdminPayDialogProps {
  batches: AdminBatch[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid: () => void;
}

export function AdminPayDialog({ batches, open, onOpenChange, onPaid }: AdminPayDialogProps) {
  const [isPaying, setIsPaying] = useState(false);
  const [alert, setAlert] = useState<AlertState | null>(null);

  const totalPayout = batches.reduce((sum, b) => sum + b.estimatedPayout, 0);

  const handlePay = async () => {
    setAlert(null);
    setIsPaying(true);
    try {
      const result = await payBatch({ batchIds: batches.map((b) => b.id) });

      if (result.serverError) {
        setAlert({ variant: 'error', title: 'Pago fallido', description: result.serverError });
        return;
      }

      if (!result.data?.success) {
        setAlert({ variant: 'error', title: 'Pago fallido', description: 'Error desconocido' });
        return;
      }

      const { results, errors } = result.data;
      const successCount = results.length;
      const errorCount = errors?.length ?? 0;

      if (errorCount > 0 && successCount > 0) {
        const errorDetails = errors!
          .map((e) => `Lote #${e.batchId}: ${e.error}`)
          .join('\n');
        setAlert({
          variant: 'warning',
          title: `${successCount} pagado(s), ${errorCount} fallido(s)`,
          description: `Lotes exitosos: ${results.map((r) => `#${r.batchId}`).join(', ')}. Errores:\n${errorDetails}`,
        });
        setTimeout(() => {
          onOpenChange(false);
          onPaid();
        }, 3000);
      } else if (errorCount > 0) {
        const errorDetails = errors!
          .map((e) => `Lote #${e.batchId}: ${e.error}`)
          .join('\n');
        setAlert({
          variant: 'error',
          title: `${errorCount} pago(s) fallido(s)`,
          description: errorDetails,
        });
      } else {
        setAlert({
          variant: 'success',
          title: `${successCount} lote(s) en proceso de pago`,
          description: 'Los pagos están siendo procesados por Binance. Se confirmarán automáticamente.',
        });
        setTimeout(() => {
          onOpenChange(false);
          onPaid();
        }, 1500);
      }
    } catch (error) {
      setAlert({ variant: 'error', title: 'Pago fallido', description: error instanceof Error ? error.message : 'Error desconocido' });
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
            Estás a punto de pagar {batches.length} lote{batches.length > 1 ? 's' : ''} vía Binance. El proceso puede tardar unos segundos.
          </DialogDescription>
        </DialogHeader>

        {alert && (
          <InlineAlert
            variant={alert.variant}
            title={alert.title}
            description={alert.description}
            autoDismiss={alert.variant === 'success' || alert.variant === 'warning'}
            dismissAfter={alert.variant === 'warning' ? 5000 : 3000}
            onDismiss={() => setAlert(null)}
          />
        )}

        <div className="space-y-1">
          {batches.map((batch) => (
            <div key={batch.id} className="flex items-center justify-between text-sm">
              <span>
                Lote #{batch.id} ({batch.seller.name})
              </span>
              <span className="font-medium">{formatCurrency(batch.estimatedPayout)}</span>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between border-t pt-2 font-semibold">
            <span>Total</span>
            <span>{formatCurrency(totalPayout)}</span>
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
