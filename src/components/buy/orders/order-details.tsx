'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Info, XCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';
import { toast } from 'sonner';
import { cancelOrder } from '@/actions/order-actions';
import { ClaimCodeField } from '@/components/ui/claim-code-field';
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
        toast.success('¡Orden cancelada con éxito!');
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
    <div className="space-y-2 p-4">
      <div className="mb-4 flex items-center gap-2 px-2">
        <Info className="text-primary h-3.5 w-3.5" />
        <p className="text-muted-foreground text-sm font-bold tracking-widest uppercase">Revisa los detalles de tu orden a continuación.</p>
      </div>

      <div className="text-muted-foreground/60 hidden grid-cols-12 gap-4 px-4 py-2 text-sm font-black tracking-widest uppercase md:grid">
        <div className="col-span-1">Pos.</div>
        <div className="col-span-3">Marca y Región</div>
        <div className="col-span-3">Vista Previa del Código</div>
        <div className="col-span-2">Valor</div>
        <div className="col-span-2">Etapa</div>
        <div className="col-span-1 text-right">Detalles</div>
      </div>

      <div className="space-y-1.5">
        {order.giftcards.map((card, idx) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.03 }}
            className="group/card border-border/40 bg-card hover:border-primary/20 grid grid-cols-1 items-center gap-4 rounded-2xl border px-4 py-3 transition-all md:grid-cols-12"
          >
            <div className="text-muted-foreground/40 col-span-1 hidden font-mono text-sm font-bold italic md:block">#{idx + 1}</div>

            <div className="col-span-3 flex items-center gap-3">
              <div className="border-border/60 relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border bg-white shadow-sm">
                {card.brand.image ? (
                  <Image src={card.brand.image} alt={card.brand.name} fill className="object-contain p-1" loading="eager" />
                ) : (
                  <span className="text-lg">{card.brand.icon}</span>
                )}
              </div>
              <div>
                <div className="text-sm font-black tracking-tight uppercase italic">{card.brand.name}</div>
                <div className="text-muted-foreground text-sm font-bold tracking-wide">{card.country?.name || 'GLOBAL'}</div>
              </div>
            </div>

            <div className="col-span-3">
              <ClaimCodeField code={card.claimCode} />
            </div>

            <div className="col-span-2 text-base font-black italic">
              {card.isConfirmed && card.status !== 'USED' ? (
                card.status === 'WRONG_AMOUNT' && card.reportedAmount != null ? (
                  <div className="flex flex-col">
                    <span className="text-destructive/50 text-sm line-through">${card.amount.toFixed(2)}</span>
                    <span className="text-amber-500">${card.reportedAmount.toFixed(2)}</span>
                  </div>
                ) : (
                  <span className="text-destructive line-through">${card.amount.toFixed(2)}</span>
                )
              ) : (
                <span className="text-primary">${card.amount.toFixed(2)}</span>
              )}
            </div>

            <div className="col-span-2">
              <GiftcardStatusBadge card={card} orderStatus={order.status} />
            </div>

            <div className="col-span-1 flex justify-end text-right">
              <Button
                size="icon"
                variant="ghost"
                className="hover:bg-primary/10 hover:text-primary h-8 w-8 rounded-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  onCardClick?.(card, order.status);
                }}
              >
                <span className="sr-only">Ver detalles</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Order Payments Section */}
      <TransactionList payments={order.payments} />

      {/* Action Buttons */}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        {/* Resume button - only for PENDING and AWAITING_PAYMENT */}
        {(order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT') && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleResumeOrder();
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reanudar Orden
          </Button>
        )}

        {/* Cancel button - only for PENDING and AWAITING_PAYMENT */}
        {(order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT') && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelOrder();
                    }}
                    disabled={!canCancel || isCancelling}
                    variant="outline"
                    className="border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    {isCancelling ? <Spinner size="sm" className="mr-2" /> : <XCircle className="mr-2 h-4 w-4" />}
                    Cancelar Orden
                  </Button>
                </span>
              </TooltipTrigger>
              {!canCancel && (
                <TooltipContent className="bg-destructive text-destructive-foreground p-2 text-sm font-bold">
                  <p>No se puede cancelar: la orden tiene tarjetas con valor. Espera a que se complete o contacta a soporte.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
