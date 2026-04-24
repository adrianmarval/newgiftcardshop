'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Package, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BatchDetails } from './batch-details';
import type { BatchCardProps } from './types';
import Image from 'next/image';

export function BatchCard({ batch, isExpanded, onToggle, onCardClick }: BatchCardProps) {
  const confirmedCount = batch.giftcards.filter((g) => g.isConfirmed).length;
  const totalItems = batch.giftcards.length;
  const allConfirmed = confirmedCount === totalItems && totalItems > 0;
  const isPaid = batch.isPaid || batch.payments.some((p) => p.status === 'COMPLETED');
  const progressPercentage = totalItems > 0 ? (confirmedCount / totalItems) * 100 : 0;
  const hasReport = batch.giftcards.some((g) => g.isConfirmed && g.status !== 'USED');
  const batchTotal = batch.giftcards.reduce((sum, g) => sum + g.amount, 0);

  const getStatus = (): { label: string; color: string } => {
    if (isPaid) {
      return { label: 'PAID', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
    }
    if (allConfirmed) {
      return { label: 'CONFIRMED', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
    }
    return { label: `PROCESSING (${confirmedCount}/${totalItems})`, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
  };

  const status = getStatus();

  return (
    <Card
      onClick={onToggle}
      className={`gap-1 hover:border-primary/30 relative cursor-pointer overflow-hidden py-2 transition-all duration-200 ease-out ${isExpanded ? 'ring-primary/20 ring-1' : ''}`}
    >
      {hasReport && (
        <div className="absolute top-0 right-0 z-20">
          <AlertTriangle className="text-destructive fill-destructive/20 h-4 w-4 drop-shadow-md" />
        </div>
      )}

      <CardHeader>
        <CardTitle>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 md:gap-4">
            <Image
              src={batch.giftcards[0].brand.image || '/'}
              alt={batch.giftcards[0].brand.name}
              width={20}
              height={20}
              className={`h-10 w-10 rounded-lg object-contain p-1 ${status.color}`}
            />

            <div className="flex flex-col gap-0.5">
              <span className="text-foreground text-md font-medium md:text-base">Batch #{batch.id}</span>
              <div className="flex items-center gap-2">
                <Badge className={`${status.color} px-1.5 py-0 text-[10px] md:text-xs`}>{status.label}</Badge>
                <span className="text-muted-foreground hidden text-xs md:inline-block">
                  {batch.giftcards.length} {batch.giftcards.length === 1 ? 'tarjeta' : 'tarjetas'}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-0.5">
              <span className="text-foreground text-md font-semibold md:text-lg">${batchTotal.toFixed(0)}</span>
              <span className="text-muted-foreground text-xs md:text-sm">You get: ${batch.estimatedPayout.toFixed(0)}</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex items-center justify-between">
        <span className="text-muted-foreground">Published on {new Date(batch.createdAt).toLocaleDateString()}</span>
        <ChevronDown className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </CardContent>

      <div className="bg-muted flex h-1 overflow-hidden rounded-full">
        {isPaid ? (
          <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-emerald-500" />
        ) : allConfirmed ? (
          <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-blue-500" />
        ) : (
          <>
            <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} className="h-full bg-blue-500" />
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
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="border-border cursor-default border-t p-3" onClick={(e) => e.stopPropagation()}>
              <BatchDetails batch={batch} onCardClick={onCardClick} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
