'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';

interface SellerDialogProps {
  seller: {
    id: string;
    name: string;
    email: string;
    sellRate: number;
    orderCount: number;
    createdAt: string;
    twoFactorEnabled: boolean;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminSellerDialog({ seller, open, onOpenChange }: SellerDialogProps) {
  if (!seller) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card rounded-3xl sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic">Información del Vendedor</DialogTitle>
          <DialogDescription className="sr-only">Datos completos del vendedor</DialogDescription>
        </DialogHeader>

        <div className="space-y-1 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">Nombre</span>
            <span className="font-bold">{seller.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">Email</span>
            <span className="font-bold">{seller.email}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">Tasa de Venta</span>
            <Badge variant="outline">{(seller.sellRate * 100).toFixed(2)}%</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">Lotes</span>
            <span className="font-bold">{seller.orderCount}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">2FA</span>
            <Badge variant={seller.twoFactorEnabled ? 'default' : 'secondary'}>
              {seller.twoFactorEnabled ? 'Habilitado' : 'Deshabilitado'}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">Fecha de Registro</span>
            <span className="text-sm">{formatDateTime(seller.createdAt, 'es-AR')}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
