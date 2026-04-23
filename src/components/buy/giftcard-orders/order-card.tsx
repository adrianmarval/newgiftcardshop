'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Package, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { OrderDetails } from '@/components/buy/giftcard-orders/order-details';
import { cancelOrder } from '@/actions/order/cancel';
import { Spinner } from '@/components/ui/spinner';
import type { OrderCardProps } from './types';
import Image from 'next/image';

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'PENDIENTE', color: 'bg-amber-500/20 text-amber-500 border-amber-500/30' },
  AWAITING_PAYMENT: { label: 'ESPERANDO', color: 'bg-blue-500/20 text-blue-500 border-blue-500/30' },
  COMPLETED: { label: 'COMPLETADA', color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' },
  CANCELLED: { label: 'CANCELADA', color: 'bg-destructive/20 text-destructive border-destructive/30' },
};

export const OrderCard = ({ order, onCardClick }: OrderCardProps) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const confirmedCount = order.giftcards.filter((g) => g.isConfirmed).length;
  const totalItems = order.giftcards.length;
  const progressPercentage = totalItems > 0 ? (confirmedCount / totalItems) * 100 : 0;
  const canCancel = order.effectiveTotal === 0 && (order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT');
  const status = statusConfig[order.status] || { label: order.status, color: 'bg-muted' };
  const isActionable = order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT';

  const handleResumeOrder = () => {
    router.push(`/buy/dashboard/browse-cards?orderId=${order.id}`);
  };

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelOrder({ orderId: order.id });
      if (result.serverError || result.validationErrors) {
        const errorMsg =
          result.serverError ?? (Array.isArray(result.validationErrors?._errors) ? result.validationErrors._errors.join(', ') : 'Error');
        toast.error('Error al cancelar la orden', { description: errorMsg });
      } else {
        toast.success('Orden cancelada con exito');
        router.refresh();
      }
    } catch (error) {
      toast.error('Error al cancelar la orden', { description: error instanceof Error ? error.message : 'Error desconocido' });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Card
      className={`border-border bg-card relative overflow-hidden rounded-xl transition-all ${isExpanded ? 'ring-primary/20 ring-1' : ''}`}
    >
      <div onClick={() => setIsExpanded(!isExpanded)} className="flex cursor-pointer items-center justify-between p-1">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${status.color}`}>
            <Image
              src={order.giftcards[0].brand.image || '/'}
              alt={order.giftcards[0].brand.name}
              width={20}
              height={20}
              className="w-auto"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-foreground text-md font-medium md:text-base">Order #{order.id.slice(-8).toUpperCase()}</span>
            <span className="text-muted-foreground text-sm md:text-sm">{new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-foreground text-md font-semibold md:text-lg">${order.faceValueTotal.toFixed(0)}</span>
            <span className="text-muted-foreground text-sm md:text-sm">${order.effectiveTotal.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-end">
            <Badge className={`${status.color} flex items-center gap-1 px-2 py-0.5 text-[10px] md:text-sm`}>{status.label}</Badge>
            <ChevronDown
              className={`text-muted-foreground flex h-4 w-full items-center justify-center transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      </div>

      <div className="bg-muted flex h-1 overflow-hidden rounded-full">
        {order.status === 'COMPLETED' ? (
          <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-emerald-500" />
        ) : order.status === 'CANCELLED' ? (
          <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="bg-destructive h-full" />
        ) : (
          <>
            <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} className="bg-primary h-full" />
            <div className="flex-1 bg-amber-400" />
          </>
        )}
      </div>

      {isActionable && (
        <div className="border-border flex gap-2 border-t px-3 py-2">
          <Button
            onClick={handleResumeOrder}
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 text-xs md:h-9 md:px-4 md:text-sm"
          >
            Reanudar
          </Button>
          {canCancel && (
            <Button
              onClick={handleCancelOrder}
              disabled={isCancelling}
              variant="outline"
              size="sm"
              className="border-destructive/50 text-destructive hover:bg-destructive/10 h-8 px-2 text-xs md:h-9 md:px-3 md:text-sm"
            >
              {isCancelling ? <Spinner size="sm" className="mr-1" /> : null}
              Cancelar
            </Button>
          )}
        </div>
      )}

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-border border-t p-3">
              <OrderDetails order={order} onCardClick={onCardClick} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
