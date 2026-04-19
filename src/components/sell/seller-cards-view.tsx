'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  ChevronDown,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  TrendingUp,
  History,
  Info,
  Package,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';
import { useQueryState } from 'nuqs';
import type { SellerBatch, Giftcard } from '@/types';
import type { SellerCardsViewProps } from './types';
import { ClaimCodeField } from '@/components/ui/claim-code-field';
import { EmptyState } from '@/components/ui/empty-state';
import { GiftcardStatusBadge } from '@/components/ui/giftcard-status-badge';

export const SellerCardsView = ({ batches }: SellerCardsViewProps) => {
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useQueryState('search', { defaultValue: '' });
  const [statusFilter, setStatusFilter] = useQueryState('status', { defaultValue: 'all' });
  const [selectedCard, setSelectedCard] = useState<Giftcard | null>(null);

  const totalBatches = batches.length;
  const totalCardsCount = batches.reduce((acc, b) => acc + b.giftcards.length, 0);
  const totalVolume = batches.reduce((acc, b) => acc + b.giftcards.reduce((sum, g) => sum + g.amount, 0), 0);

  const totalPaid = batches.reduce((acc, b) => {
    const paymentTotal = b.payments.filter((p) => p.status === 'COMPLETED').reduce((sum, p) => sum + p.amount, 0);
    if (paymentTotal > 0) return acc + paymentTotal;
    if (b.isPaid) return acc + b.estimatedPayout;
    return acc;
  }, 0);

  const awaitingPayoutCount = batches.filter((b) => {
    const allConfirmed = b.giftcards.every((g) => g.isConfirmed);
    const notPaid = !b.isPaid && !b.payments.some((p) => p.status === 'COMPLETED');
    return allConfirmed && notPaid && b.giftcards.length > 0;
  }).length;

  // Filtering Logic
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
    if (statusFilter === 'awaiting') return isAwaitingPayout && matchesSearch;
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
        icon: <CheckCircle2 className="h-4 w-4" />,
      };
    }
    if (allConfirmed) {
      return {
        label: 'AWAITING PAYOUT',
        color: 'bg-primary/20 text-primary border-primary/30',
        icon: <TrendingUp className="h-4 w-4" />,
      };
    }
    return {
      label: `PROCESSING (${confirmedCount}/${total})`,
      color: 'bg-muted text-muted-foreground border-border',
      icon: <Clock className="h-4 w-4" />,
    };
  };

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Header & Stats Section */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="group border-border bg-card/50 hover:border-primary/50 space-y-2 p-6 backdrop-blur-sm transition-all">
          <div className="text-muted-foreground flex items-center justify-between">
            <span className="text-[10px] font-black tracking-widest uppercase md:text-sm">Batches History</span>
            <History className="text-primary h-4 w-4" />
          </div>
          <div className="text-3xl font-black tracking-tighter italic md:text-4xl">{totalBatches}</div>
          <p className="text-muted-foreground text-xs italic md:text-sm">{totalCardsCount} cards total</p>
        </Card>

        <Card className="group border-border bg-card/50 space-y-2 p-6 backdrop-blur-sm transition-all hover:border-blue-500/50">
          <div className="text-muted-foreground flex items-center justify-between">
            <span className="text-[10px] font-black tracking-widest uppercase md:text-sm">Pending Payout</span>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-3xl font-black tracking-tighter text-blue-500 italic md:text-4xl">{awaitingPayoutCount}</div>
          <p className="text-muted-foreground text-xs italic md:text-sm">Batches ready for payment</p>
        </Card>

        <Card className="group border-border bg-card/50 space-y-2 p-6 backdrop-blur-sm transition-all hover:border-emerald-500/50">
          <div className="text-muted-foreground flex items-center justify-between">
            <span className="text-[10px] font-black tracking-widest uppercase md:text-sm">Total Earnings</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black tracking-tighter text-emerald-500 italic md:text-4xl">${totalPaid.toFixed(2)}</div>
          <p className="text-muted-foreground text-xs italic md:text-sm">Sent to your wallet</p>
        </Card>

        <Card className="group border-border bg-card/50 space-y-2 p-6 backdrop-blur-sm transition-all hover:border-amber-500/50">
          <div className="text-muted-foreground flex items-center justify-between">
            <span className="text-[10px] font-black tracking-widest uppercase md:text-sm">Gross Inventory</span>
            <Package className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black tracking-tighter text-amber-500 italic md:text-4xl">${totalVolume.toFixed(2)}</div>
          <p className="text-muted-foreground text-xs italic md:text-sm">Total nominal value loaded</p>
        </Card>
      </div>

      {/* 2. Filters & Actions */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight uppercase italic md:text-3xl">Dashboard History</h2>
          <p className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase md:text-sm">
            Monitor your batches status in real-time
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search code or brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-border bg-muted/20 h-10 pl-10 font-medium"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="border-border bg-muted/20 h-10 w-full text-sm font-bold uppercase sm:w-44">
              <Filter className="mr-2 h-3 w-3" />
              <SelectValue placeholder="STATUS" />
            </SelectTrigger>
            <SelectContent className="border-border bg-popover text-popover-foreground">
              <SelectItem value="all">ALL BATCHES</SelectItem>
              <SelectItem value="processing">PROCESSING</SelectItem>
              <SelectItem value="awaiting">AWAITING PAYOUT</SelectItem>
              <SelectItem value="paid">PAID</SelectItem>
              <SelectItem value="reported">HAS REPORTS</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3. Batch List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredBatches.length > 0 ? (
            filteredBatches.map((batch) => {
              const isExpanded = expandedBatch === batch.id;
              const batchTotal = batch.giftcards.reduce((sum, g) => sum + g.amount, 0);
              const { estimatedPayout } = batch;
              const confirmedCount = batch.giftcards.filter((g) => g.isConfirmed).length;
              const totalItems = batch.giftcards.length;
              const progressPercentage = totalItems > 0 ? (confirmedCount / totalItems) * 100 : 0;
              const status = getBatchStatusInfo(batch);
              const hasReport = batch.giftcards.some((g) => g.isConfirmed && g.status !== 'USED');

              return (
                <Card
                  key={batch.id}
                  className={`border-border overflow-hidden transition-all duration-300 ${isExpanded ? 'bg-background ring-primary/20 ring-2' : 'bg-card/40 hover:border-primary/30'}`}
                >
                  {/* Batch Header */}
                  <div
                    onClick={() => setExpandedBatch(isExpanded ? null : batch.id)}
                    className="group relative flex cursor-pointer flex-col justify-between gap-4 p-4 md:flex-row md:items-center md:p-6"
                  >
                    {/* Progress Bar background */}
                    <div className="bg-primary/10 absolute top-0 left-0 h-1 w-full">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} className="bg-primary/40 h-full" />
                    </div>

                    <div className="flex items-center gap-4">
                      <div
                        className={`rounded-xl p-3 ${status.color.includes('emerald') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'} shadow-sm transition-colors`}
                      >
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground/50 text-sm font-black tracking-widest uppercase">ID</span>
                          <span className="font-mono text-sm font-bold">{batch.id.slice(-8).toUpperCase()}</span>
                        </div>
                        <div className="text-muted-foreground font-mono text-sm font-bold">
                          {new Date(batch.createdAt).toLocaleDateString()} AT{' '}
                          {new Date(batch.createdAt)
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
                        <div className="text-muted-foreground mb-0.5 text-sm font-black tracking-widest uppercase">Confirmation</div>
                        <div className="text-base font-black tracking-tighter italic">
                          {confirmedCount}/{totalItems} Cnfrm.
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground mb-0.5 text-sm font-black tracking-widest uppercase">Value</div>
                        <div className="text-primary text-base font-black tracking-tighter italic">${batchTotal.toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground mb-0.5 text-sm font-black tracking-widest uppercase">Est. Payout</div>
                        <div className="text-base font-black tracking-tighter text-emerald-500 italic">${estimatedPayout.toFixed(2)}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        {hasReport && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="bg-destructive/10 text-destructive flex animate-pulse items-center gap-1.5 rounded p-1 px-2">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span className="text-sm font-black">ISSUE</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-destructive text-destructive-foreground p-2 text-sm font-bold">
                                <p>Some cards in this batch have been reported as invalid or used.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        <Badge className={`${status.color} flex items-center gap-1.5 px-3 py-1 text-sm font-black tracking-tight italic`}>
                          {status.icon} {status.label}
                        </Badge>

                        <div className={`bg-muted/20 rounded-full p-1 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                          <ChevronDown className="text-muted-foreground group-hover:text-primary h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content (Cards) */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="border-border bg-muted/5 border-t font-medium"
                      >
                        <div className="space-y-2 p-4">
                          <div className="mb-4 flex items-center gap-2 px-2">
                            <Info className="text-primary h-3.5 w-3.5" />
                            <p className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
                              Review card status and wait for buyers to confirm usage.
                            </p>
                          </div>

                          <div className="text-muted-foreground/60 hidden grid-cols-12 gap-4 px-4 py-2 text-sm font-black tracking-widest uppercase md:grid">
                            <div className="col-span-1">Pos.</div>
                            <div className="col-span-3">Brand & Region</div>
                            <div className="col-span-3">Code Preview</div>
                            <div className="col-span-2">Value</div>
                            <div className="col-span-2">Stage</div>
                            <div className="col-span-1 text-right">Details</div>
                          </div>

                          <div className="space-y-1.5">
                            {batch.giftcards.map((card, idx) => (
                              <motion.div
                                key={card.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.03 }}
                                className="group/card border-border/40 bg-card hover:border-primary/20 grid grid-cols-1 items-center gap-4 rounded-2xl border px-4 py-3 transition-all md:grid-cols-12"
                              >
                                <div className="text-muted-foreground/40 col-span-1 hidden font-mono text-sm font-bold italic md:block">
                                  #{idx + 1}
                                </div>

                                <div className="col-span-3 flex items-center gap-3">
                                  <div className="border-border/60 relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border bg-white shadow-sm">
                                    {card.brand.image ? (
                                      <Image
                                        src={card.brand.image}
                                        alt={card.brand.name}
                                        fill
                                        className="object-contain p-1"
                                        loading="eager"
                                      />
                                    ) : (
                                      <span className="text-lg">{card.brand.icon}</span>
                                    )}
                                  </div>
                                  <div>
                                    <div className="text-sm font-black tracking-tight uppercase italic">{card.brand.name}</div>
                                    <div className="text-muted-foreground text-sm font-bold tracking-wide">
                                      {card.country?.name || 'GLOBAL'}
                                    </div>
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
                                  <GiftcardStatusBadge card={card} />
                                </div>

                                <div className="col-span-1 flex justify-end text-right">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="hover:bg-primary/10 hover:text-primary h-8 w-8 rounded-lg"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCard(card);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </motion.div>
                            ))}
                          </div>

                          {/* Batch Payments Section */}
                          {batch.payments.length > 0 && (
                            <div className="relative mt-8 overflow-hidden rounded-3xl border border-emerald-500/10 bg-emerald-500/5 p-6">
                              <div className="absolute top-0 right-0 -mt-16 -mr-16 h-32 w-32 rounded-full bg-emerald-500/5 blur-3xl" />
                              <h4 className="mb-4 inline-flex items-center gap-2 text-sm font-black tracking-[0.2em] text-emerald-500 uppercase">
                                <CreditCard className="h-3 w-3" /> Payout Information
                              </h4>
                              <div className="space-y-2.5">
                                {batch.payments.map((p) => (
                                  <div
                                    key={p.id}
                                    className="bg-background/50 flex items-center justify-between rounded-xl border border-emerald-500/10 px-2 py-2 text-sm"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-foreground font-mono font-black tracking-tighter uppercase">
                                          TRX ID: {p.id.slice(-8).toUpperCase()}
                                        </span>
                                        <span className="text-muted-foreground text-sm font-bold">
                                          {new Date(p.createdAt).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-xl font-black text-emerald-500 italic">+${p.amount.toFixed(2)}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              );
            })
          ) : (
            <EmptyState
              icon={<History className="text-muted-foreground/20 h-12 w-12" />}
              title="No records found"
              description="Try adjusting your filters or search keywords."
            />
          )}
        </AnimatePresence>
      </div>

      {/* 4. Details Dialog */}
      <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
        <DialogContent className="border-border bg-card rounded-3xl sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic">Card Details</DialogTitle>
            <DialogDescription>View detailed information about this gift card</DialogDescription>
          </DialogHeader>
          {selectedCard && (
            <div className="space-y-8 pt-4">
              <div className="bg-muted/30 relative flex items-center gap-4 overflow-hidden rounded-3xl p-5">
                <div className="border-border/50 relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border bg-white shadow-md">
                  {selectedCard.brand.image ? (
                    <Image
                      src={selectedCard.brand.image}
                      alt={selectedCard.brand.name}
                      fill
                      className="object-contain p-1"
                      loading="eager"
                    />
                  ) : (
                    <span className="text-3xl">{selectedCard.brand.icon}</span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 text-2xl leading-none font-black tracking-tighter uppercase italic">{selectedCard.brand.name}</h3>
                  <p className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
                    {selectedCard.country?.name || 'Global'}
                  </p>
                </div>
                <div className="text-right">
                  {selectedCard.isConfirmed && selectedCard.status !== 'USED' ? (
                    selectedCard.status === 'WRONG_AMOUNT' && selectedCard.reportedAmount != null ? (
                      <div className="space-y-1">
                        <div className="flex flex-col items-end">
                          <span className="text-muted-foreground/60 text-sm font-black tracking-widest uppercase">Original</span>
                          <span className="text-destructive/50 text-xl leading-none font-black italic line-through">
                            ${selectedCard.amount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-black tracking-widest text-amber-500/80 uppercase">Effective</span>
                          <span className="text-3xl leading-none font-black text-amber-500 italic">
                            ${selectedCard.reportedAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="text-destructive text-3xl leading-none font-black italic line-through">
                          ${selectedCard.amount.toFixed(2)}
                        </div>
                        <div className="text-destructive/60 text-sm font-black tracking-widest uppercase">Voided</div>
                      </div>
                    )
                  ) : (
                    <div className="text-primary mb-1 text-2xl leading-none font-black italic">${selectedCard.amount.toFixed(2)}</div>
                  )}
                  <div className="mt-1 origin-right scale-90">
                    <GiftcardStatusBadge card={selectedCard} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-base font-black tracking-widest uppercase">
                    <Info className="h-3 w-3" /> Security Code
                  </span>
                  <div className="group border-border/60 bg-muted/20 flex items-center justify-between rounded-2xl border p-4">
                    <code className="text-foreground font-mono text-lg font-black tracking-widest">{selectedCard.claimCode}</code>
                  </div>
                </div>

                {selectedCard.pinCode && (
                  <div className="space-y-2">
                    <span className="text-muted-foreground text-base font-black tracking-widest uppercase">Pin Access</span>
                    <div className="border-border/60 bg-muted/20 rounded-2xl border p-4 font-mono text-base font-black">
                      {selectedCard.pinCode}
                    </div>
                  </div>
                )}
              </div>

              {selectedCard.isConfirmed && selectedCard.status !== 'USED' && (
                <div className="border-destructive/20 bg-destructive/10 relative flex gap-4 overflow-hidden rounded-2xl border p-5 italic">
                  <div className="bg-destructive/5 absolute top-0 right-0 -mt-12 -mr-12 h-24 w-24 rounded-full blur-2xl" />
                  <AlertTriangle className="text-destructive mt-1 h-6 w-6 shrink-0" />
                  <div className="space-y-1.5">
                    <p className="text-destructive text-sm font-black tracking-widest uppercase">Action Required</p>
                    <p className="text-destructive/80 text-base leading-relaxed font-bold uppercase">
                      THIS CARD WAS REPORTED AS <span className="underline">{selectedCard.status.replace('_', ' ')}</span>. THE BUYER
                      CLAIMED AN ISSUE DURING REDEMPTION.
                    </p>
                  </div>
                </div>
              )}

              <Button
                onClick={() => setSelectedCard(null)}
                className="bg-primary text-primary-foreground shadow-primary/20 h-14 w-full rounded-2xl text-xl font-black uppercase italic shadow-xl transition-all active:scale-95"
              >
                Close View
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
