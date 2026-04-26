'use client';

import { Plus, Pencil, Trash2 } from 'lucide-react';
import { CardFooter } from '@/components/ui/card';
import { GiftcardItem } from '@/components/ui/giftcard-item';
import type { AdminOrderDetailsProps } from './types';
import type { Giftcard } from '@/types/domain/giftcard';

export function AdminOrderDetails({ order, onCardClick, onAddReport, onEditReport, onDeleteReport }: AdminOrderDetailsProps) {
  const confirmedCount = order.giftcards.filter((g) => g.isConfirmed).length;

  const hasIssue = (card: Giftcard) => {
    return ['INVALID', 'ALREADY_USED', 'DEACTIVATED', 'WRONG_AMOUNT'].includes(card.status);
  };

  const renderCardActions = (card: Giftcard) => {
    const baseBtnClass = 'h-6 w-6 p-0';

    if (!hasIssue(card)) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddReport?.(card);
          }}
          className="bg-primary text-primary-foreground flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold"
          title="Reportar problema"
        >
          <Plus className="h-3 w-3" />
        </button>
      );
    }

    if (card.status === 'WRONG_AMOUNT') {
      return (
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditReport?.(card);
            }}
            className={baseBtnClass}
            title="Editar monto"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteReport?.(card);
            }}
            className={`${baseBtnClass} text-destructive`}
            title="Eliminar reporte"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDeleteReport?.(card);
        }}
        className={`${baseBtnClass} text-destructive`}
        title="Eliminar reporte"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium md:text-sm">
          {confirmedCount}/{order.giftcards.length} tarjetas confirmadas
        </span>
        <span className="text-muted-foreground text-xs font-medium md:text-sm">Tasa: {(order.buyRate * 100).toFixed(0)}%</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {order.giftcards.map((card) => (
          <GiftcardItem
            key={card.id}
            card={card}
            onViewDetails={onCardClick ? (c) => onCardClick(c, order.status) : undefined}
            contextualInfo={
              <CardFooter className="bg-muted/30 mt-auto flex items-center justify-between border-t p-1 px-3">
                <div className="flex items-center gap-2">{renderCardActions(card)}</div>
                <span className="text-muted-foreground ml-2 shrink-0 text-[9px] font-bold tracking-widest uppercase">{card.status}</span>
              </CardFooter>
            }
            showCopyButton={false}
          />
        ))}
      </div>
    </div>
  );
}
