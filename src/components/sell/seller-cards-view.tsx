'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronDown,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  History,
  Package,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { useQueryState } from 'nuqs';
import type { SellerBatch, Giftcard } from '@/types';
import type { SellerCardsViewProps } from './types';
import { GiftcardStatusBadge } from '@/components/ui/giftcard-status-badge';
import { SellerStats } from '@/components/sell/seller-stats';

export const SellerCardsView = ({ batches }: SellerCardsViewProps) => {
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useQueryState('search', { defaultValue: '' });
  const [statusFilter, setStatusFilter] = useQueryState('status', { defaultValue: 'all' });
  const [selectedCard, setSelectedCard] = useState<Giftcard | null>(null);

  const filteredBatches = batches.filter((batch) => {
    const matchesSearch = batch.giftcards.some(
      (g) => g.claimCode.toLowerCase().includes(searchTerm.toLowerCase()) || g.brand.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const isPaid = batch.isPaid || batch.payments.some((p) => p.status === 'COMPLETED');
    const allConfirmed = batch.giftcards.every((g) => g.isConfirmed);
    const isAwaitingPayout = allConfirmed && !isPaid && batch.giftcards.length > 0;
    const isProcessing = !allConfirmed && !isPaid;
    const hasReport = batch.giftcards.some((g) => ['INVALID', 'ALREADY_USED', 'DEACTIVATED'].includes(g.status));

    if (statusFilter === 'paid') return isPaid && matchesSearch;
    if (statusFilter === 'confirmed') return isAwaitingPayout && matchesSearch;
    if (statusFilter === 'processing') return isProcessing && matchesSearch;
    if (statusFilter === 'reported') return hasReport && matchesSearch;

    return matchesSearch;
  });

  const getBatchStatusInfo = (batch: SellerBatch) => {
    const isPaid = batch.isPaid || batch.payments.some((p) => p.status === 'COMPLETED');
    const confirmedCount = batch.giftcards.filter((g) => g.isConfirmed).length;
    const total = batch.giftcards.length;
    const allConfirmed = confirmedCount === total && total > 0;

    if (isPaid) {
      return {
        label: 'PAID',
        color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        icon: <CheckCircle2 className="h-3 w-3" />,
      };
    }
    if (allConfirmed) {
      return { label: 'CONFIRMED', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: <CheckCircle2 className="h-3 w-3" /> };
    }
    return {
      label: `PROCESSING (${confirmedCount}/${total})`,
      color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      icon: <Clock className="h-3 w-3" />,
    };
  };

  return (
    <div className="space-y-4 pb-8">
      <SellerStats batches={batches} />

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-border bg-muted/20 h-8 pr-3 pl-9 text-xs md:h-10 md:text-sm"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant={statusFilter !== 'all' ? 'default' : 'outline'} size="sm" className="h-8 gap-1.5 px-2 md:h-9 md:gap-2 md:px-3">
              <SlidersHorizontal className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden md:inline">Filters</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-4" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Filters</span>
                {statusFilter !== 'all' && (
                  <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')} className="h-7 text-xs">
                    <X className="mr-1 h-3 w-3" />
                    Clear
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-muted-foreground text-xs font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs md:h-9 md:text-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="reported">Reported</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {statusFilter !== 'all' && (
          <Button variant="ghost" size="icon" onClick={() => setStatusFilter('all')} className="h-9 w-9 md:hidden">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {filteredBatches.length === 0 ? (
          <div className="border-border bg-card flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
            <History className="text-muted-foreground mb-2 h-8 w-8" />
            <p className="text-muted-foreground text-sm">No batches found</p>
          </div>
        ) : (
          filteredBatches.map((batch) => {
            const isExpanded = expandedBatch === batch.id;
            const batchTotal = batch.giftcards.reduce((sum, g) => sum + g.amount, 0);
            const { estimatedPayout } = batch;
            const confirmedCount = batch.giftcards.filter((g) => g.isConfirmed).length;
            const totalItems = batch.giftcards.length;
            const allConfirmed = confirmedCount === totalItems && totalItems > 0;
            const isPaid = batch.isPaid || batch.payments.some((p) => p.status === 'COMPLETED');
            const progressPercentage = totalItems > 0 ? (confirmedCount / totalItems) * 100 : 0;
            const status = getBatchStatusInfo(batch);
            const hasReport = batch.giftcards.some((g) => g.isConfirmed && g.status !== 'USED');

            return (
              <Card
                key={batch.id}
                className={`border-border bg-card overflow-hidden rounded-xl transition-all ${isExpanded ? 'ring-primary/20 ring-1' : ''}`}
              >
                <div
                  onClick={() => setExpandedBatch(isExpanded ? null : batch.id)}
                  className="flex cursor-pointer items-center justify-between p-3"
                >
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
                      <span className="text-muted-foreground text-[10px] md:text-sm">→ ${estimatedPayout.toFixed(0)}</span>
                    </div>
                    {hasReport && <AlertTriangle className="text-destructive h-4 w-4" />}
                    <Badge className={`${status.color} flex items-center gap-1 px-2 py-0.5 text-[10px] md:text-sm`}>
                      {status.icon}
                      {status.label}
                    </Badge>
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
                      className="overflow-hidden"
                    >
                      <div className="border-border border-t p-3">
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
                            <div key={card.id} className="bg-muted/50 flex items-center justify-between rounded-lg px-2 py-2">
                              <div className="flex items-center gap-2">
                                <div className="border-border bg-background relative h-6 w-6 shrink-0 overflow-hidden rounded border">
                                  {card.brand.image ? (
                                    <Image src={card.brand.image} alt={card.brand.name} fill className="object-contain" unoptimized />
                                  ) : (
                                    <span className="text-xs">{card.brand.icon}</span>
                                  )}
                                </div>
                                <span className="text-muted-foreground font-mono text-xs md:max-w-[150px] md:text-sm">
                                  {card.claimCode}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col items-end gap-0.5">
                                  {card.status === 'WRONG_AMOUNT' && card.reportedAmount != null ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-muted-foreground text-xs line-through md:text-sm">
                                        ${card.amount.toFixed(2)}
                                      </span>
                                      <span className="text-xs font-medium text-amber-500 md:text-sm">
                                        ${card.reportedAmount.toFixed(2)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span
                                      className={`text-xs font-medium md:text-sm ${card.isConfirmed && card.status !== 'USED' ? 'text-destructive line-through' : 'text-emerald-500'}`}
                                    >
                                      ${card.amount.toFixed(2)}
                                    </span>
                                  )}
                                  {card.orderId && !card.isConfirmed && (
                                    <span className="animate-pulse text-[9px] font-bold tracking-tight text-blue-500 md:text-xs">
                                      Taken (Pending)
                                    </span>
                                  )}
                                  {card.status && card.status !== 'USED' && card.status !== 'WRONG_AMOUNT' && (
                                    <span className="text-destructive text-[9px] font-medium md:text-xs">
                                      {card.status.replace('_', ' ')}
                                    </span>
                                  )}
                                  {card.status === 'WRONG_AMOUNT' && (
                                    <span className="text-[9px] font-medium text-amber-500 md:text-xs">WRONG AMOUNT</span>
                                  )}
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCard(card);
                                  }}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
        <DialogContent className="border-border bg-card max-w-sm rounded-xl p-4">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg font-medium md:text-xl">Card Details</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm md:text-base">Gift card information</DialogDescription>
          </DialogHeader>
          {selectedCard && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="border-border bg-background relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border md:h-14 md:w-14">
                  {selectedCard.brand.image ? (
                    <Image src={selectedCard.brand.image} alt={selectedCard.brand.name} fill className="object-contain" unoptimized />
                  ) : (
                    <span className="text-xl md:text-2xl">{selectedCard.brand.icon}</span>
                  )}
                </div>
                <div>
                  <p className="text-foreground font-medium md:text-lg">{selectedCard.brand.name}</p>
                  <p className="text-muted-foreground text-xs md:text-sm">{selectedCard.country?.name || 'Global'}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-foreground text-lg font-semibold md:text-2xl">${selectedCard.amount.toFixed(2)}</p>
                  <GiftcardStatusBadge card={selectedCard} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-muted-foreground text-xs font-medium md:text-sm">Code</label>
                <div className="border-border bg-muted/50 rounded-lg border px-3 py-2">
                  <code className="text-foreground text-xs md:text-sm">{selectedCard.claimCode}</code>
                </div>
                {selectedCard.pinCode && (
                  <>
                    <label className="text-muted-foreground text-xs font-medium md:text-sm">PIN</label>
                    <div className="border-border bg-muted/50 rounded-lg border px-3 py-2">
                      <code className="text-foreground text-xs md:text-sm">{selectedCard.pinCode}</code>
                    </div>
                  </>
                )}
              </div>

              <Button
                onClick={() => setSelectedCard(null)}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 h-10 w-full rounded-lg md:h-12"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
