'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/date-formatter';
import type { AdminBuyerDialogProps } from './types';

export function AdminBuyerDialog({ buyer, open, onOpenChange }: AdminBuyerDialogProps) {
  if (!buyer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card rounded-3xl sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic">Información del Comprador</DialogTitle>
          <DialogDescription className="sr-only">Datos completos del comprador</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">Nombre</span>
            <span className="font-bold">{buyer.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">Email</span>
            <span className="font-bold">{buyer.email}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">Tasa de Compra</span>
            <Badge variant="outline">{(buyer.buyRate * 100).toFixed(2)}%</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">Órdenes</span>
            <span className="font-bold">{buyer.orderCount}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">2FA</span>
            <Badge variant={buyer.twoFactorEnabled ? 'default' : 'secondary'}>
              {buyer.twoFactorEnabled ? 'Habilitado' : 'Deshabilitado'}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">Fecha de Registro</span>
            <span className="text-sm">{formatDateTime(buyer.createdAt, 'es-AR')}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
