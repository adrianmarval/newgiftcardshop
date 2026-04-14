'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Package, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';
import { OrderDetails } from '@/components/buy/orders/order-details';
import type { OrderCardProps } from './types';
import type { Giftcard } from '@/types';

// Status badge configuration
const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: {
    label: 'PENDIENTE',
    color: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
    icon: null,
  },
  AWAITING_PAYMENT: {
    label: 'ESPERANDO PAGO',
    color: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    icon: null,
  },
  COMPLETED: {
    label: 'COMPLETADA',
    color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
    icon: null,
  },
  CANCELLED: {
    label: 'CANCELADA',
    color: 'bg-destructive/20 text-destructive border-destructive/30',
    icon: null,
  },
};

export const OrderCard = ({ order, onCardClick }: OrderCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const confirmedCount = order.giftcards.filter((g) => g.isConfirmed).length;
  const totalItems = order.giftcards.length;
  const progressPercentage = totalItems > 0 ? (confirmedCount / totalItems) * 100 : 0;
  const hasIssues = order.giftcards.some((g) => g.isConfirmed && g.status !== 'USED');
  const canCancel = order.effectiveTotal === 0 && (order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT');
  const status = statusConfig[order.status] || {
    label: order.status,
    color: 'bg-muted',
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

  return (
    <Card
      className={`border-border overflow-hidden transition-all duration-300 ${isExpanded ? 'bg-background ring-primary/20 ring-2' : 'bg-card/40 hover:border-primary/30'}`}
    >
      {/* Order Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="group relative flex cursor-pointer flex-col justify-between gap-4 p-4 md:flex-row md:items-center md:p-6"
      >
        {/* Progress Bar background */}
        <div className="bg-primary/10 absolute top-0 left-0 h-1 w-full">
          <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} className="bg-primary/40 h-full" />
        </div>

        <div className="flex items-center gap-4">
          <div
            className={`rounded-xl p-3 ${status.color.includes('emerald') ? 'bg-emerald-500/10 text-emerald-500' : status.color.includes('amber') ? 'bg-amber-500/10 text-amber-500' : status.color.includes('blue') ? 'bg-blue-500/10 text-blue-500' : status.color.includes('destructive') ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'} shadow-sm transition-colors`}
          >
            <Package className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground/50 text-sm font-black tracking-widest uppercase">ID</span>
              <span className="font-mono text-sm font-bold">{order.id.slice(-8).toUpperCase()}</span>
            </div>
            <div className="text-muted-foreground font-mono text-sm font-bold">
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

        <div className="flex flex-wrap items-center gap-4 md:gap-8">
          <div className="text-right">
            <div className="text-muted-foreground mb-0.5 text-sm font-black tracking-widest uppercase">Tarjetas</div>
            <div className="text-base font-black tracking-tighter italic">
              {confirmedCount}/{totalItems} Conf.
            </div>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground mb-0.5 text-sm font-black tracking-widest uppercase">Total</div>
            <div className="text-primary text-base font-black tracking-tighter italic">
              ${(order.adjustedTotal ?? order.total).toFixed(2)}
            </div>
          </div>

          {/* Brand icons */}
          <div className="flex items-center gap-1">
            {brandIcons.map((brand, idx) => (
              <div
                key={idx}
                className="border-border/60 relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border bg-white shadow-sm"
              >
                {brand.image ? (
                  <Image src={brand.image} alt={brand.name} fill className="object-contain p-1" loading="eager" />
                ) : (
                  <span className="text-lg">{brand.icon}</span>
                )}
              </div>
            ))}
            {extraBrands > 0 && (
              <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black">+{extraBrands}</div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasIssues && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-destructive/10 text-destructive flex animate-pulse items-center gap-1.5 rounded p-1 px-2">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="text-sm font-black">PROBLEMA</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-destructive text-destructive-foreground p-2 text-sm font-bold">
                    <p>Algunas tarjetas en esta orden han sido reportadas como inválidas, monto incorrecto o usadas.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <Badge className={`${status.color} flex items-center gap-1.5 px-3 py-1 text-sm font-black tracking-tight italic`}>
              {status.label}
            </Badge>

            <div className={`bg-muted/20 rounded-full p-1 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown className="text-muted-foreground group-hover:text-primary h-4 w-4" />
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
