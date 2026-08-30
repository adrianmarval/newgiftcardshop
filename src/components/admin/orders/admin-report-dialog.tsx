'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { manageReport } from '@/actions/admin/orders';
import { Spinner } from '@/components/ui/spinner';
import { InlineAlert } from '@/components/ui/inline-alert';
import type { Giftcard } from '@/types';
import { formatCurrency } from '@/lib/utils';
import type { AlertState } from '@/components/admin/types';

interface AdminReportDialogProps {
  card: Giftcard | null;
  orderId: string | null;
  mode: 'ADD' | 'EDIT' | 'DELETE' | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AdminReportDialog({ card, orderId, mode, open, onOpenChange, onSuccess }: AdminReportDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [issueType, setIssueType] = useState<'INVALID' | 'ALREADY_USED' | 'DEACTIVATED' | 'WRONG_AMOUNT'>('WRONG_AMOUNT');
  const [reportedAmount, setReportedAmount] = useState<string>('');
  const [alert, setAlert] = useState<AlertState | null>(null);

  const currentMode = mode ?? 'ADD';

  const handleSubmit = async () => {
    if (!card || !orderId) return;

    setAlert(null);
    setIsLoading(true);
    try {
      let result;
      if (currentMode === 'ADD') {
        result = await manageReport({
          action: 'ADD',
          giftcardId: card.id,
          orderId,
          issueType,
          reportedAmount: issueType === 'WRONG_AMOUNT' ? Number(reportedAmount) : undefined,
        });
      } else if (currentMode === 'EDIT') {
        result = await manageReport({
          action: 'UPDATE',
          giftcardId: card.id,
          orderId,
          reportedAmount: Number(reportedAmount),
        });
      } else {
        result = await manageReport({
          action: 'DELETE',
          giftcardId: card.id,
          orderId,
        });
      }

      if (!result) {
        setAlert({ variant: 'error', title: 'Error al gestionar el reporte' });
        return;
      }

      if (result.serverError || result.validationErrors) {
        setAlert({ variant: 'error', title: 'Error al gestionar el reporte' });
      } else {
        const messages = {
          ADD: 'Reporte agregado',
          EDIT: 'Reporte actualizado',
          DELETE: 'Reporte eliminado',
        };
        setAlert({ variant: 'success', title: messages[currentMode] });
        setTimeout(() => {
          onSuccess?.();
          onOpenChange(false);
        }, 1200);
      }
    } catch {
      setAlert({ variant: 'error', title: 'Error al gestionar el reporte' });
    } finally {
      setIsLoading(false);
    }
  };

  const title = currentMode === 'ADD' ? 'Agregar Reporte' : currentMode === 'EDIT' ? 'Editar Monto' : 'Eliminar Reporte';
  const submitLabel = currentMode === 'ADD' ? 'Agregar' : currentMode === 'EDIT' ? 'Actualizar' : 'Eliminar';
  const isWrongAmountDisabled = currentMode === 'ADD' && issueType === 'WRONG_AMOUNT' && !reportedAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="custom-scrollbar border-border bg-card max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic">{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1 pt-4">
          {alert && (
            <InlineAlert
              variant={alert.variant}
              title={alert.title}
              description={alert.description}
              autoDismiss
              dismissAfter={3000}
              onDismiss={() => setAlert(null)}
            />
          )}

          {card && (
            <div className="bg-muted/30 flex items-center gap-1 rounded-2xl p-3">
              <div>
                <p className="font-black">{card.brand.name}</p>
                <p className="text-muted-foreground text-sm">{formatCurrency(card.amount)}</p>
              </div>
            </div>
          )}

          {currentMode === 'ADD' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Issue</Label>
                <Select value={issueType} onValueChange={(v) => setIssueType(v as typeof issueType)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INVALID">Código Inválido</SelectItem>
                    <SelectItem value="ALREADY_USED">Ya Canjeado</SelectItem>
                    <SelectItem value="DEACTIVATED">Desactivado</SelectItem>
                    <SelectItem value="WRONG_AMOUNT">Monto Incorrecto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {issueType === 'WRONG_AMOUNT' && (
                <div className="space-y-1">
                  <Label className="text-xs">Monto Reportado</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={reportedAmount}
                    onChange={(e) => setReportedAmount(e.target.value)}
                    className="h-9"
                  />
                </div>
              )}
            </>
          )}

          {currentMode === 'EDIT' && (
            <div className="space-y-1">
              <Label className="text-xs">Monto Reportado</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={reportedAmount}
                onChange={(e) => setReportedAmount(e.target.value)}
                className="h-9"
              />
            </div>
          )}

          {currentMode === 'DELETE' && (
            <p className="text-muted-foreground text-sm">
              ¿Estás seguro de que deseas eliminar el reporte de esta tarjeta? La tarjeta quedará como USADA.
            </p>
          )}

          <div className="flex gap-1 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || isWrongAmountDisabled} className="flex-1">
              {isLoading && <Spinner size="sm" className="mr-2" />}
              {submitLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
