'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, CreditCard, Clock, CheckCircle2, AlertTriangle, Eye, History, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { useQueryState } from 'nuqs';
import type { SellerBatch, Giftcard } from '@/types';
import type { SellerCardsViewProps } from './types';
import { GiftcardStatusBadge } from '@/components/ui/giftcard-status-badge';

const StatCard = ({ label, value, subtext, color }: { label: string; value: string; subtext: string; color: string }) => (
  <div className="rounded-xl border border-slate-700/30 bg-slate-800/20 p-3">
    <span className="text-[10px] font-medium text-slate-400 uppercase">{label}</span>
    <p className={`text-xl font-semibold ${color}`}>{value}</p>
    <span className="text-[10px] text-slate-500">{subtext}</span>
  </div>
);

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
        color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        icon: <CheckCircle2 className="h-3 w-3" />,
      };
    }
    if (allConfirmed) {
      return { label: 'CONFIRMED', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <CheckCircle2 className="h-3 w-3" /> };
    }
    return {
      label: `PROCESSING (${confirmedCount}/${total})`,
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: <Clock className="h-3 w-3" />,
    };
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Batches" value={String(totalBatches)} subtext={`${totalCardsCount} cards`} color="text-white" />
        <StatCard label="Confirmed" value={String(awaitingPayoutCount)} subtext="Awaiting" color="text-blue-400" />
        <StatCard label="Earned" value={`$${totalPaid.toFixed(0)}`} subtext="Paid" color="text-emerald-400" />
        <StatCard label="Volume" value={`$${totalVolume.toFixed(0)}`} subtext="Total" color="text-amber-400" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 rounded-lg border border-slate-700/50 bg-slate-800/30 pl-9 text-sm text-white placeholder:text-slate-500"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 rounded-lg border border-slate-700/50 bg-slate-800/30 text-sm">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent className="rounded-lg border border-slate-700/50 bg-[#0d1117]">
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="reported">Reported</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filteredBatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/30 p-8 text-center">
            <History className="mb-2 h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-400">No batches found</p>
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
                className={`overflow-hidden rounded-xl border-slate-700/30 transition-all ${isExpanded ? 'bg-slate-800/50 ring-1 ring-emerald-500/20' : 'bg-slate-800/20'}`}
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
                      <span className="text-xs font-medium text-white">#{batch.id.slice(-6).toUpperCase()}</span>
                      <span className="text-[10px] text-slate-500">{new Date(batch.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold text-white">${batchTotal.toFixed(0)}</span>
                      <span className="text-[10px] text-slate-500">→ ${estimatedPayout.toFixed(0)}</span>
                    </div>
                    {hasReport && <AlertTriangle className="h-4 w-4 text-red-400" />}
                    <Badge className={`${status.color} flex items-center gap-1 px-2 py-0.5 text-[10px]`}>
                      {status.icon}
                      {status.label}
                    </Badge>
                    <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                <div className="flex h-1 overflow-hidden rounded-full bg-slate-800">
                  {isPaid ? (
                    <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-emerald-500" />
                  ) : allConfirmed ? (
                    <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-blue-500" />
                  ) : (
                    <>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} className="h-full bg-blue-500" />
                      <div className="flex-1 bg-amber-500/50" />
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
                      <div className="border-t border-slate-700/30 p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-400">{totalItems} cards confirmed</span>
                          {batch.payments.length > 0 && (
                            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-400">
                              <CreditCard className="mr-1 h-3 w-3" />
                              {batch.payments.length} payment(s)
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1">
                          {batch.giftcards.map((card) => (
                            <div key={card.id} className="flex items-center justify-between rounded-lg bg-slate-800/20 px-2 py-2">
                              <div className="flex items-center gap-2">
                                <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded border border-slate-700/50 bg-slate-800">
                                  {card.brand.image ? (
                                    <Image src={card.brand.image} alt={card.brand.name} fill className="object-contain" unoptimized />
                                  ) : (
                                    <span className="text-xs">{card.brand.icon}</span>
                                  )}
                                </div>
                                <span className="max-w-[100px] truncate font-mono text-xs text-slate-400">{card.claimCode}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col items-end gap-0.5">
                                  {card.status === 'WRONG_AMOUNT' && card.reportedAmount != null ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-slate-500 line-through">${card.amount.toFixed(2)}</span>
                                      <span className="text-xs font-medium text-amber-400">${card.reportedAmount.toFixed(2)}</span>
                                    </div>
                                  ) : (
                                    <span
                                      className={`text-xs font-medium ${card.isConfirmed && card.status !== 'USED' ? 'text-red-400 line-through' : 'text-emerald-400'}`}
                                    >
                                      ${card.amount.toFixed(2)}
                                    </span>
                                  )}
                                  {card.status && card.status !== 'USED' && card.status !== 'WRONG_AMOUNT' && (
                                    <span className="text-[9px] font-medium text-red-400">{card.status.replace('_', ' ')}</span>
                                  )}
                                  {card.status === 'WRONG_AMOUNT' && (
                                    <span className="text-[9px] font-medium text-amber-400">WRONG AMOUNT</span>
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
                                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                  <span className="text-[10px] text-emerald-400">#{p.id.slice(-6).toUpperCase()}</span>
                                </div>
                                <span className="text-xs font-semibold text-emerald-400">+${p.amount.toFixed(2)}</span>
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
        <DialogContent className="max-w-sm rounded-2xl border border-slate-700/50 bg-[#0d1117] p-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium text-white">Card Details</DialogTitle>
            <DialogDescription className="text-sm text-slate-400">Gift card information</DialogDescription>
          </DialogHeader>
          {selectedCard && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-700/50 bg-slate-800">
                  {selectedCard.brand.image ? (
                    <Image src={selectedCard.brand.image} alt={selectedCard.brand.name} fill className="object-contain" unoptimized />
                  ) : (
                    <span className="text-xl">{selectedCard.brand.icon}</span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-white">{selectedCard.brand.name}</p>
                  <p className="text-xs text-slate-400">{selectedCard.country?.name || 'Global'}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-lg font-semibold text-white">${selectedCard.amount.toFixed(2)}</p>
                  <GiftcardStatusBadge card={selectedCard} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">Code</label>
                <div className="rounded-lg border border-slate-700/30 bg-slate-800/20 px-3 py-2">
                  <code className="text-xs text-white">{selectedCard.claimCode}</code>
                </div>
                {selectedCard.pinCode && (
                  <>
                    <label className="text-xs font-medium text-slate-400">PIN</label>
                    <div className="rounded-lg border border-slate-700/30 bg-slate-800/20 px-3 py-2">
                      <code className="text-xs text-white">{selectedCard.pinCode}</code>
                    </div>
                  </>
                )}
              </div>

              <Button
                onClick={() => setSelectedCard(null)}
                className="h-10 w-full rounded-lg bg-slate-700 text-sm font-medium text-white hover:bg-slate-600"
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
