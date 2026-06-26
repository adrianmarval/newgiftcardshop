'use client';

import { Plus, Pencil, Trash2 } from 'lucide-react';
import { CardFooter } from '@/components/ui/card';
import { GiftcardItem } from '@/components/common/giftcard-item';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import type { Giftcard } from '@/types';
import type { AdminOrder } from '@/types';

interface GiftcardWithSeller extends Giftcard {
  seller: { id: string; name: string; email: string } | null;
}

interface AdminOrderDetailsProps {
  order: AdminOrder;
  onAddReport?: (card: Giftcard) => void;
  onEditReport?: (card: Giftcard) => void;
  onDeleteReport?: (card: Giftcard) => void;
}

export function AdminOrderDetails({ order, onAddReport, onEditReport, onDeleteReport }: AdminOrderDetailsProps) {
  const confirmedCount = order.giftcards.filter((g) => g.isConfirmed).length;

  const hasIssue = (card: Giftcard) => {
    return ['INVALID', 'ALREADY_USED', 'DEACTIVATED', 'WRONG_AMOUNT'].includes(card.status);
  };

  const renderCardActions = (card: Giftcard) => {
    if (!hasIssue(card)) {
      return (
        <DropdownMenuItem onSelect={() => onAddReport?.(card)}>
          <Plus className="h-4 w-4" />
          Reportar
        </DropdownMenuItem>
      );
    }

    if (card.status === 'WRONG_AMOUNT') {
      return (
        <>
          <DropdownMenuItem onSelect={() => onEditReport?.(card)}>
            <Pencil className="h-4 w-4" />
            Editar Monto
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => onDeleteReport?.(card)}>
            <Trash2 className="h-4 w-4" />
            Eliminar Reporte
          </DropdownMenuItem>
        </>
      );
    }

    return (
      <DropdownMenuItem variant="destructive" onSelect={() => onDeleteReport?.(card)}>
        <Trash2 className="h-4 w-4" />
        Eliminar Reporte
      </DropdownMenuItem>
    );
  };

  return (
    <div className="space-y-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium md:text-sm">
          {confirmedCount}/{order.giftcards.length} tarjetas confirmadas
        </span>
        <span className="text-muted-foreground text-xs font-medium md:text-sm">Tasa: {(order.buyRate * 100).toFixed(1)}%</span>
      </div>

      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {order.giftcards.map((card) => (
          <GiftcardItem
            key={card.id}
            card={card}
            dropdownActions={renderCardActions(card)}
            contextualInfo={
              (card as GiftcardWithSeller).seller ? (
                <CardFooter className="bg-muted/30 mt-auto flex items-center justify-between border-t p-1 px-3">
                  <div className="flex min-w-0 items-center gap-1">
                    <div className="border-primary/20 bg-primary/10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border">
                      <span className="text-primary text-[10px] font-bold">
                        {(card as GiftcardWithSeller).seller!.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="text-foreground truncate text-[11px] leading-tight font-semibold">
                        {(card as GiftcardWithSeller).seller!.name}
                      </span>
                      <span className="text-muted-foreground truncate text-[9px] leading-tight">
                        {(card as GiftcardWithSeller).seller!.email}
                      </span>
                    </div>
                  </div>
                  <span className="text-muted-foreground ml-2 shrink-0 text-[9px] font-bold tracking-widest uppercase">Vendedor</span>
                </CardFooter>
              ) : undefined
            }
            showCopyButton={false}
          />
        ))}
      </div>
    </div>
  );
}
