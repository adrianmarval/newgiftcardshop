'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GiftcardStatusBadge } from '@/components/ui/giftcard-status-badge';
import Image from 'next/image';
import type { Giftcard } from '@/types';

interface CardDetailDialogProps {
  card: Giftcard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CardDetailDialog({ card, open, onOpenChange }: CardDetailDialogProps) {
  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card max-w-sm rounded-xl p-4">
        <DialogHeader>
          <DialogTitle className="text-foreground text-lg font-medium md:text-xl">Card Details</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm md:text-base">Gift card information</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="border-border bg-background relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border md:h-14 md:w-14">
              {card.brand.image ? (
                <Image src={card.brand.image} alt={card.brand.name} fill className="object-contain" unoptimized />
              ) : (
                <span className="text-xl md:text-2xl">{card.brand.icon}</span>
              )}
            </div>
            <div>
              <p className="text-foreground font-medium md:text-lg">{card.brand.name}</p>
              <p className="text-muted-foreground text-xs md:text-sm">{card.country?.name || 'Global'}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-foreground text-lg font-semibold md:text-2xl">${card.amount.toFixed(2)}</p>
              <GiftcardStatusBadge card={card} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-muted-foreground text-xs font-medium md:text-sm">Code</label>
            <div className="border-border bg-muted/50 rounded-lg border px-3 py-2">
              <code className="text-foreground text-xs md:text-sm">{card.claimCode}</code>
            </div>
            {card.pinCode && (
              <>
                <label className="text-muted-foreground text-xs font-medium md:text-sm">PIN</label>
                <div className="border-border bg-muted/50 rounded-lg border px-3 py-2">
                  <code className="text-foreground text-xs md:text-sm">{card.pinCode}</code>
                </div>
              </>
            )}
          </div>

          <Button
            onClick={() => onOpenChange(false)}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 h-10 w-full rounded-lg md:h-12"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
