'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Package, AlertTriangle, RotateCcw, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';
import { toast } from 'sonner';
import { OrderDetails } from '@/components/buy/orders/order-details';
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
    <Card
      className={`border-border overflow-hidden transition-all duration-300 ${isExpanded ? 'bg-background ring-primary/20 ring-2' : 'bg-card/40 hover:border-primary/30'}`}
    >
      {/* Order Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="group relative flex cursor-pointer flex-col justify-between gap-3 p-2 md:flex-row md:items-center md:p-4"
      >
        {/* Progress Bar background */}
        <div className="bg-primary/10 absolute top-0 left-0 h-1 w-full">
          <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} className="bg-primary/40 h-full" />
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <div
            className={`rounded-xl p-2.5 md:p-3 ${status.color.includes('emerald') ? 'bg-emerald-500/10 text-emerald-500' : status.color.includes('amber') ? 'bg-amber-500/10 text-amber-500' : status.color.includes('blue') ? 'bg-blue-500/10 text-blue-500' : status.color.includes('destructive') ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'} shadow-sm transition-colors`}
          >
            <Package className="h-4 w-4 md:h-5 md:w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground/50 text-xs font-medium uppercase md:text-sm">ID</span>
              <span className="font-mono text-xs font-bold md:text-sm">{order.id.slice(-8).toUpperCase()}</span>
            </div>
            <div className="text-muted-foreground font-mono text-xs md:text-sm">
              {new Date(order.createdAt).toLocaleDateString()} A LAS{' '}
              {new Date(order.createdAt)
                .toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                .toUpperCase()}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:gap-6">
          <div className="text-right">
            <div className="text-muted-foreground mb-0.5 text-xs font-medium uppercase md:text-sm">Tarjetas</div>
            <div className="text-sm font-semibold md:text-base">
              {confirmedCount}/{totalItems} Conf.
            </div>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground mb-0.5 text-xs font-medium uppercase md:text-sm">Total</div>
            <div className="text-primary text-sm font-semibold md:text-base">${(order.adjustedTotal ?? order.total).toFixed(2)}</div>
          </div>

          {/* Brand icons */}
          <div className="hidden items-center gap-1 md:flex">
            {brandIcons.map((brand, idx) => (
              <div
                key={idx}
                className="border-border/60 relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg border bg-white shadow-sm"
              >
                {brand.image ? (
                  <Image src={brand.image} alt={brand.name} fill className="object-contain p-0.5" loading="eager" />
                ) : (
                  <span className="text-sm">{brand.icon}</span>
                )}
              </div>
            ))}
            {extraBrands > 0 && (
              <div className="bg-muted flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium">+{extraBrands}</div>
            )}
          </div>

          {/* Action buttons - always visible */}
          {isActionable && (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={handleResumeOrder}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 h-7 px-2 text-xs font-medium md:h-9 md:px-4 md:text-sm"
                    >
                      <RotateCcw className="mr-1 h-2.5 w-2.5 md:mr-2 md:h-3.5 md:w-3.5" />
                      <span className="hidden sm:inline">Reanudar</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover text-popover-foreground p-2 text-xs font-medium">
                    <p>Continuar con esta orden</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelOrder}
                        disabled={!canCancel || isCancelling}
                        className="border-destructive/50 text-destructive hover:bg-destructive/10 h-7 px-1.5 text-xs font-medium md:h-9 md:px-3 md:text-sm"
                      >
                        {isCancelling ? (
                          <Spinner size="sm" className="mr-0.5 md:mr-1" />
                        ) : (
                          <XCircle className="mr-1 h-2.5 w-2.5 md:mr-2 md:h-3.5 md:w-3.5" />
                        )}
                        <span className="hidden sm:inline">Cancelar</span>
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canCancel && (
                    <TooltipContent className="bg-destructive text-destructive-foreground p-2 text-xs font-medium">
                      <p>No se puede cancelar: la orden tiene tarjetas con valor</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          <div className="flex items-center gap-2">
            {hasIssues && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-destructive/10 text-destructive flex animate-pulse items-center gap-1 rounded p-1 px-1.5">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="text-xs font-medium md:text-sm">PROBLEMA</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-destructive text-destructive-foreground p-2 text-xs font-medium">
                    <p>Algunas tarjetas en esta orden han sido reportadas</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <Badge className={`${status.color} flex items-center gap-1 px-2 py-0.5 text-xs font-medium md:text-sm`}>{status.label}</Badge>

            <div className={`bg-muted/20 rounded-full p-1 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown className="text-muted-foreground group-hover:text-primary h-3.5 w-3.5 md:h-4 md:w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content (Order Details) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="border-border bg-muted/5 border-t font-medium"
          >
            <OrderDetails order={order} canCancel={canCancel} onCardClick={onCardClick} />
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
