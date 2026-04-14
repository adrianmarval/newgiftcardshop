"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import Image from "next/image";
import { GiftcardStatusBadge } from "@/components/ui/giftcard-status-badge";
import { GiftcardIssueAlert } from "@/components/ui/giftcard-issue-alert";
import type { CardDetailDialogProps } from "@/types";

export function CardDetailDialog({ card, orderStatus, open, onOpenChange }: CardDetailDialogProps) {
  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-106.25 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black italic tracking-tighter uppercase">Detalles de la Tarjeta</DialogTitle>
          <DialogDescription className="sr-only">Ver el código de reclamo, pin y estado de tu tarjeta de regalo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-8 pt-4">
          <div className="p-5 bg-muted/30 rounded-3xl flex items-center gap-4 relative overflow-hidden">
            <div className="w-14 h-14 bg-white rounded-2xl relative overflow-hidden flex items-center justify-center shadow-md border border-border/50">
              {card.brand.image ? (
                <Image src={card.brand.image} alt={card.brand.name} fill className="object-contain p-1" loading="eager" />
              ) : (
                <span className="text-3xl">{card.brand.icon}</span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-black text-2xl italic uppercase tracking-tighter leading-none mb-1">{card.brand.name}</h3>
              <p className="text-sm text-muted-foreground font-bold tracking-widest uppercase">{card.country?.name || "Global"}</p>
            </div>
            <div className="text-right">
              {card.isConfirmed && card.status !== "USED" ? (
                card.status === "WRONG_AMOUNT" && card.reportedAmount != null ? (
                  <div className="space-y-1">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-black uppercase tracking-widest text-muted-foreground/60">Original</span>
                      <span className="text-xl font-black text-destructive/50 italic leading-none line-through">
                        ${card.amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-black uppercase tracking-widest text-amber-500/80">Efectivo</span>
                      <span className="text-3xl font-black text-amber-500 italic leading-none">${card.reportedAmount.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <div className="text-3xl font-black text-destructive italic leading-none line-through">${card.amount.toFixed(2)}</div>
                    <div className="text-sm font-black uppercase tracking-widest text-destructive/60">Anulada</div>
                  </div>
                )
              ) : (
                <div className="text-2xl font-black text-primary italic leading-none mb-1">${card.amount.toFixed(2)}</div>
              )}
              <div className="scale-90 origin-right mt-1">
                <GiftcardStatusBadge card={card} orderStatus={orderStatus ?? undefined} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-base font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                <Info className="w-3 h-3" /> Código de Reclamo
              </span>
              <div className="p-4 bg-muted/20 border border-border/60 rounded-2xl overflow-hidden">
                <code className="text-sm font-mono font-black tracking-tight text-foreground break-all">{card.claimCode}</code>
              </div>
            </div>

            {card.pinCode && (
              <div className="space-y-2">
                <span className="text-base font-black uppercase text-muted-foreground tracking-widest">Acceso Pin</span>
                <div className="p-4 bg-muted/20 border border-border/60 rounded-2xl font-mono text-sm font-black break-all overflow-hidden">
                  {card.pinCode}
                </div>
              </div>
            )}
          </div>

          {card.isConfirmed && card.status !== "USED" && <GiftcardIssueAlert status={card.status} />}

          <Button
            onClick={() => onOpenChange(false)}
            className="w-full h-14 font-black bg-primary text-primary-foreground text-xl italic uppercase shadow-xl shadow-primary/20 rounded-2xl transition-all active:scale-95"
          >
            Cerrar Vista
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
