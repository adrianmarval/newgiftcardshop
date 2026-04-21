'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { toast } from 'sonner';
import { cancelOrder } from '@/actions/order-actions';
import { GiftcardStatusBadge } from '@/components/ui/giftcard-status-badge';
import { TransactionList } from '@/components/ui/transaction-list';
import { Spinner } from '@/components/ui/spinner';
import type { OrderDetailsProps } from './types';

export function OrderDetails({ order, canCancel, onCardClick }: OrderDetailsProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelOrder({ orderId: order.id });
      if (result.serverError || result.validationErrors) {
        toast.error('Error al cancelar la orden', {
          description: (result.serverError || result.validationErrors?._errors) as string,
        });
      } else {
        toast.success('Orden cancelada con exito');
        router.refresh();
      }
    } catch (error) {
      toast.error('Error al cancelar la orden', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleResumeOrder = () => {
    router.push(`/buy/dashboard/browse-cards?orderId=${order.id}`);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        {order.giftcards.map((card) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-muted/50 flex items-center justify-between rounded-lg px-2 py-2"
          >
            <div className="flex items-center gap-2">
              <div className="border-border bg-background relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded border md:h-8 md:w-8">
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

      {order.payments.length > 0 && <TransactionList payments={order.payments} />}

      {(order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT') && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            onClick={handleResumeOrder}
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 text-xs md:h-9 md:px-4 md:text-sm"
          >
            Resume
          </Button>
          <Button
            onClick={handleCancelOrder}
            disabled={!canCancel || isCancelling}
            variant="outline"
            size="sm"
            className="border-destructive/50 text-destructive hover:bg-destructive/10 h-8 px-2 text-xs md:h-9 md:px-3 md:text-sm"
          >
            {isCancelling ? <Spinner size="sm" className="mr-1" /> : null}
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
