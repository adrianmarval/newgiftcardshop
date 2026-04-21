'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Package, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BatchDetails } from './batch-details';
import type { BatchCardProps } from './types';

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
      className={`border-border bg-card relative overflow-hidden rounded-xl transition-all ${isExpanded ? 'ring-primary/20 ring-1' : ''}`}
    >
      {hasReport && (
        <div className="absolute top-2 right-2 z-20">
          <AlertTriangle className="text-destructive fill-destructive/20 h-5 w-5 drop-shadow-md" />
        </div>
      )}
      <div onClick={onToggle} className="flex cursor-pointer items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${status.color}`}>
            <Package className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-foreground text-xs font-medium md:text-base">Batch #{batch.id.slice(-6).toUpperCase()}</span>
            <span className="text-muted-foreground text-[10px] md:text-sm">{new Date(batch.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-foreground text-sm font-semibold md:text-lg">${batchTotal.toFixed(0)}</span>
            <span className="text-muted-foreground text-[10px] md:text-sm">→ ${batch.estimatedPayout.toFixed(0)}</span>
          </div>
          <Badge className={`${status.color} flex items-center gap-1 px-2 py-0.5 text-[10px] md:text-sm`}>{status.label}</Badge>
          <ChevronDown className={`text-muted-foreground h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

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
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-border border-t p-3">
              <BatchDetails batch={batch} onCardClick={onCardClick} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
