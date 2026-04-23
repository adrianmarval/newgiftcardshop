'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, CreditCard, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClaimCodeField } from '@/components/ui/claim-code-field';
import Image from 'next/image';
import type { OrderDetailsProps } from './types';
import { Badge } from '@/components/ui/badge';

export function OrderDetails({ order, onCardClick }: OrderDetailsProps) {
  return (
    <div className="space-y-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium md:text-base">{order.giftcards.length} cards confirmed</span>
        <span className="text-muted-foreground text-xs font-medium md:text-base">Order Rate: {order.buyRate * 100}%</span>
      </div>

      <div className="space-y-1">
        {order.giftcards.map((card) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-muted/50 flex items-start justify-between gap-2 rounded-lg px-2 py-2 md:items-center"
          >
            <div className="flex min-w-0 items-center gap-2">
              <div className="border-border bg-background relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded border md:h-8 md:w-8">
                {card.brand.image ? (
                  <Image src={card.brand.image} alt={card.brand.name} fill className="object-contain p-0.5" loading="eager" />
                ) : (
                  <span className="text-xs md:text-lg">{card.brand.icon}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <ClaimCodeField code={card.claimCode} variant="visible" showCopyButton={false} />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
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
                {card.status && card.status !== 'USED' && card.status !== 'WRONG_AMOUNT' && (
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
                  onCardClick?.(card, order.status);
                }}
              >
                <Eye className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
