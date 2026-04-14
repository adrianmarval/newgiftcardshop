'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import Image from 'next/image';
import { GiftcardStatusBadge } from '@/components/ui/giftcard-status-badge';
import { GiftcardIssueAlert } from '@/components/ui/giftcard-issue-alert';
import type { CardDetailDialogProps } from '@/types';

export function CardDetailDialog({ card, orderStatus, open, onOpenChange }: CardDetailDialogProps) {
  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card max-h-[90vh] overflow-hidden overflow-y-auto rounded-3xl sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic">Detalles de la Tarjeta</DialogTitle>
          <DialogDescription className="sr-only">Ver el código de reclamo, pin y estado de tu tarjeta de regalo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-8 pt-4">
          <div className="bg-muted/30 relative flex items-center gap-4 overflow-hidden rounded-3xl p-5">
            <div className="border-border/50 relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border bg-white shadow-md">
              {card.brand.image ? (
                <Image src={card.brand.image} alt={card.brand.name} fill className="object-contain p-1" loading="eager" />
              ) : (
                <span className="text-3xl">{card.brand.icon}</span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-2xl leading-none font-black tracking-tighter uppercase italic">{card.brand.name}</h3>
              <p className="text-muted-foreground text-sm font-bold tracking-widest uppercase">{card.country?.name || 'Global'}</p>
            </div>
            <div className="text-right">
              {card.isConfirmed && card.status !== 'USED' ? (
                card.status === 'WRONG_AMOUNT' && card.reportedAmount != null ? (
                  <div className="space-y-1">
                    <div className="flex flex-col items-end">
                      <span className="text-muted-foreground/60 text-sm font-black tracking-widest uppercase">Original</span>
                      <span className="text-destructive/50 text-xl leading-none font-black italic line-through">
                        ${card.amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-black tracking-widest text-amber-500/80 uppercase">Efectivo</span>
                      <span className="text-3xl leading-none font-black text-amber-500 italic">${card.reportedAmount.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <div className="text-destructive text-3xl leading-none font-black italic line-through">${card.amount.toFixed(2)}</div>
                    <div className="text-destructive/60 text-sm font-black tracking-widest uppercase">Anulada</div>
                  </div>
                )
              ) : (
                <div className="text-primary mb-1 text-2xl leading-none font-black italic">${card.amount.toFixed(2)}</div>
              )}
              <div className="mt-1 origin-right scale-90">
                <GiftcardStatusBadge card={card} orderStatus={orderStatus ?? undefined} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-muted-foreground flex items-center gap-1.5 text-base font-black tracking-widest uppercase">
                <Info className="h-3 w-3" /> Código de Reclamo
              </span>
              <div className="border-border/60 bg-muted/20 overflow-hidden rounded-2xl border p-4">
                <code className="text-foreground font-mono text-sm font-black tracking-tight break-all">{card.claimCode}</code>
              </div>
            </div>

            {card.pinCode && (
              <div className="space-y-2">
                <span className="text-muted-foreground text-base font-black tracking-widest uppercase">Acceso Pin</span>
                <div className="border-border/60 bg-muted/20 overflow-hidden rounded-2xl border p-4 font-mono text-sm font-black break-all">
                  {card.pinCode}
                </div>
              </div>
            )}
          </div>

          {card.isConfirmed && card.status !== 'USED' && <GiftcardIssueAlert status={card.status} />}

          <Button
            onClick={() => onOpenChange(false)}
            className="bg-primary text-primary-foreground shadow-primary/20 h-14 w-full rounded-2xl text-xl font-black uppercase italic shadow-xl transition-all active:scale-95"
          >
            Cerrar Vista
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
