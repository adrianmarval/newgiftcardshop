'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Package, XCircle, AlertTriangle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import type { GiftcardStatusBadgeProps } from '@/types';

const reportLabels: Record<string, Record<string, string>> = {
  buy: {
    INVALID: 'Inválida',
    ALREADY_USED: 'Ya Usada',
    DEACTIVATED: 'Desactivada',
    WRONG_AMOUNT: 'Monto Incorrecto',
    UNUSED: 'Sin Usar',
    USED: 'Usada',
  },
  sell: {
    INVALID: 'Invalid',
    ALREADY_USED: 'Already Used',
    DEACTIVATED: 'Deactivated',
    WRONG_AMOUNT: 'Wrong Amount',
    UNUSED: 'Unused',
    USED: 'Used',
  },
};

export function GiftcardStatusBadge({ card, orderStatus }: GiftcardStatusBadgeProps) {
  const pathname = usePathname();
  const portal = pathname?.includes('/buy') || pathname?.includes('/admin') ? 'buy' : 'sell';
  const labels = reportLabels[portal] || reportLabels.sell;

  // Cancelled order takes precedence
  if (orderStatus === 'CANCELLED') {
    return (
      <Badge className="border-border bg-muted text-muted-foreground hover:bg-muted gap-1.5 font-bold tracking-tight uppercase">
        <XCircle className="h-3 w-3" /> {portal === 'buy' ? 'Cancelada' : 'Cancelled'}
      </Badge>
    );
  }

  // Confirmed cards show their status
  if (card.isConfirmed) {
    if (card.status === 'USED') {
      return (
        <Badge className="gap-1.5 border-emerald-500/30 bg-emerald-500/20 font-bold tracking-tight text-emerald-500 uppercase hover:bg-emerald-500/20">
          <CheckCircle2 className="h-3 w-3" /> {portal === 'buy' ? 'Confirmada' : 'Confirmed'}
        </Badge>
      );
    }

    const label = labels[card.status] || card.status.replace('_', ' ');
    const isWrongAmount = card.status === 'WRONG_AMOUNT';

    return (
      <Badge
        className={`${isWrongAmount ? 'border-amber-500/30 bg-amber-500/20 text-amber-500 hover:bg-amber-500/20' : 'border-destructive/30 bg-destructive/20 text-destructive hover:bg-destructive/20'} gap-1.5 font-bold tracking-tight uppercase`}
      >
        <AlertTriangle className="h-3 w-3" /> {label}
      </Badge>
    );
  }

  // Card has an orderId but not confirmed yet = Taken (Pending)
  if (card.orderId) {
    return (
      <Badge className="animate-pulse gap-1.5 border-blue-500/30 bg-blue-500/20 font-bold tracking-tight text-blue-500 uppercase hover:bg-blue-500/20">
        <Clock className="h-3 w-3" /> {portal === 'buy' ? 'En Proceso' : 'Taken (Pending)'}
      </Badge>
    );
  }

  // Available
  return (
    <Badge className="border-border bg-muted text-muted-foreground hover:bg-muted gap-1.5 font-bold tracking-tight uppercase">
      <Package className="h-3 w-3" /> {portal === 'buy' ? 'Disponible' : 'Available'}
    </Badge>
  );
}
