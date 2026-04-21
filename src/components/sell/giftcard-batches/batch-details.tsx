'use client';

import { motion } from 'framer-motion';
import { Eye, CreditCard, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import type { BatchDetailsProps } from './types';

export function BatchDetails({ batch, onCardClick }: BatchDetailsProps) {
  const totalItems = batch.giftcards.length;

  return (
    <div className="space-y-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium md:text-base">{totalItems} cards confirmed</span>
        {batch.payments.length > 0 && (
          <Badge className="border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-500">
            <CreditCard className="mr-1 h-3 w-3" />
            {batch.payments.length} payment(s)
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        {batch.giftcards.map((card) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-muted/50 flex items-center justify-between rounded-lg px-2 py-2"
          >
            <div className="flex items-center gap-2">
              {card.orderId && !card.isConfirmed && (
                <span className="animate-pulse text-[9px] font-bold tracking-tight text-blue-500 md:text-xs">Taken</span>
              )}
              <div className="border-border bg-background relative h-6 w-6 shrink-0 overflow-hidden rounded border md:h-8 md:w-8">
                {card.brand.image ? (
                  <Image src={card.brand.image} alt={card.brand.name} fill className="object-contain p-0.5" loading="eager" />
                ) : (
                  <span className="text-xs md:text-lg">{card.brand.icon}</span>
                )}
              </div>
              <span className="text-muted-foreground font-mono text-xs md:max-w-[150px]">{card.claimCode}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end gap-0.5">
                {card.status === 'WRONG_AMOUNT' && card.reportedAmount != null ? (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-xs line-through md:text-sm">${card.amount.toFixed(2)}</span>
                    <span className="text-xs font-medium text-amber-500 md:text-sm">${card.reportedAmount.toFixed(2)}</span>
                  </div>
                ) : (
                  <span
                    className={`text-xs font-medium md:text-sm ${card.isConfirmed && card.status !== 'USED' ? 'text-destructive line-through' : 'text-emerald-500'}`}
                  >
                    ${card.amount.toFixed(2)}
                  </span>
                )}
                {card.status && card.status !== 'USED' && card.status !== 'WRONG_AMOUNT' && card.status !== 'UNUSED' && (
                  <span className="text-destructive text-[9px] font-medium md:text-xs">{card.status.replace('_', ' ')}</span>
                )}
                {card.status === 'WRONG_AMOUNT' && <span className="text-[9px] font-medium text-amber-500 md:text-xs">WRONG AMOUNT</span>}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 md:h-8 md:w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onCardClick(card);
                }}
              >
                <Eye className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {batch.payments.length > 0 && (
        <div className="mt-3 space-y-1">
          {batch.payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2 py-2"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span className="text-[10px] text-emerald-500">#{p.id.slice(-6).toUpperCase()}</span>
              </div>
              <span className="text-xs font-semibold text-emerald-500">+${p.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
