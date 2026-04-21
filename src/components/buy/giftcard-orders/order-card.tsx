'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Package, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { OrderDetails } from '@/components/buy/giftcard-orders/order-details';
import { cancelOrder } from '@/actions/order-actions';
import { Spinner } from '@/components/ui/spinner';
import type { OrderCardProps } from './types';
import type { Giftcard } from '@/types';

// Status badge configuration
const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: {
    label: 'PENDIENTE',
    color: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
  },
  AWAITING_PAYMENT: {
    label: 'ESPERANDO PAGO',
    color: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  },
  COMPLETED: {
    label: 'COMPLETADA',
    color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
  },
  CANCELLED: {
    label: 'CANCELADA',
    color: 'bg-destructive/20 text-destructive border-destructive/30',
  },
};

export const OrderCard = ({ order, onCardClick }: OrderCardProps) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const confirmedCount = order.giftcards.filter((g) => g.isConfirmed).length;
  const totalItems = order.giftcards.length;
  const progressPercentage = totalItems > 0 ? (confirmedCount / totalItems) * 100 : 0;
  const hasIssues = order.giftcards.some((g) => g.isConfirmed && g.status !== 'USED');
  const canCancel = order.effectiveTotal === 0 && (order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT');
  const status = statusConfig[order.status] || {
    label: order.status,
    color: 'bg-muted',
  };

  const handleResumeOrder = () => {
    router.push(`/buy/dashboard/browse-cards?orderId=${order.id}`);
  };

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

  // Get unique brands (up to 3)
  const uniqueBrands = order.giftcards.reduce(
    (acc, g) => {
      if (!acc.find((b) => b.name === g.brand.name)) {
        acc.push(g.brand);
      }
      return acc;
    },
    [] as Giftcard['brand'][],
  );
  const brandIcons = uniqueBrands.slice(0, 3);
  const extraBrands = uniqueBrands.length - 3;

  const isActionable = order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT';

  return (
    <Card className={`border-border bg-card overflow-hidden rounded-xl transition-all ${isExpanded ? 'ring-primary/20 ring-1' : ''}`}>
      <div onClick={() => setIsExpanded(!isExpanded)} className="flex cursor-pointer items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${status.color}`}>
            <Package className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-foreground text-xs font-medium md:text-base">Order #{order.id.slice(-8).toUpperCase()}</span>
            <span className="text-muted-foreground text-[10px] md:text-sm">{new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-foreground text-sm font-semibold md:text-lg">${(order.adjustedTotal ?? order.total).toFixed(2)}</span>
            <span className="text-muted-foreground text-[10px] md:text-sm">
              {confirmedCount}/{totalItems} cards
            </span>
          </div>
          {hasIssues && <AlertTriangle className="text-destructive h-4 w-4" />}
          <Badge className={`${status.color} flex items-center gap-1 px-2 py-0.5 text-[10px] md:text-sm`}>{status.label}</Badge>
          <ChevronDown className={`text-muted-foreground h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
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
              <OrderDetails order={order} canCancel={canCancel} onCardClick={onCardClick} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
