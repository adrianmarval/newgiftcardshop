"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Image from "next/image";
import type { SellerBatch, Giftcard, SellerCardsViewProps } from "@/types";
import { ClaimCodeField } from "@/components/ui/claim-code-field";
import { EmptyState } from "@/components/ui/empty-state";
import { GiftcardStatusBadge } from "@/components/ui/giftcard-status-badge";

export function SellerCardsView({ batches }: SellerCardsViewProps) {
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCard, setSelectedCard] = useState<Giftcard | null>(null);

  const totalBatches = batches.length;
  const totalCardsCount = batches.reduce((acc, b) => acc + b.giftcards.length, 0);
  const totalVolume = batches.reduce((acc, b) => acc + b.giftcards.reduce((sum, g) => sum + g.amount, 0), 0);

  const totalPaid = batches.reduce((acc, b) => {
    const paymentTotal = b.payments.filter((p) => p.status === "COMPLETED").reduce((sum, p) => sum + p.amount, 0);
    if (paymentTotal > 0) return acc + paymentTotal;
    if (b.isPaid) return acc + b.estimatedPayout;
    return acc;
  }, 0);

  const awaitingPayoutCount = batches.filter((b) => {
    const allConfirmed = b.giftcards.every((g) => g.isConfirmed);
    const notPaid = !b.isPaid && !b.payments.some((p) => p.status === "COMPLETED");
    return allConfirmed && notPaid && b.giftcards.length > 0;
  }).length;

  // Filtering Logic
  const filteredBatches = batches.filter((batch) => {
    const matchesSearch = batch.giftcards.some(
      (g) => g.claimCode.toLowerCase().includes(searchTerm.toLowerCase()) || g.brand.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const isPaid = batch.isPaid || batch.payments.some((p) => p.status === "COMPLETED");
    const allConfirmed = batch.giftcards.every((g) => g.isConfirmed);
    const isAwaitingPayout = allConfirmed && !isPaid && batch.giftcards.length > 0;
    const isProcessing = !allConfirmed && !isPaid;
    const hasReport = batch.giftcards.some((g) => ["INVALID", "ALREADY_USED", "DEACTIVATED"].includes(g.status));

    if (statusFilter === "paid") return isPaid && matchesSearch;
    if (statusFilter === "awaiting") return isAwaitingPayout && matchesSearch;
    if (statusFilter === "processing") return isProcessing && matchesSearch;
    if (statusFilter === "reported") return hasReport && matchesSearch;

    return matchesSearch;
  });

  const getBatchStatusInfo = (batch: SellerBatch) => {
    const isPaid = batch.isPaid || batch.payments.some((p) => p.status === "COMPLETED");
    const confirmedCount = batch.giftcards.filter((g) => g.isConfirmed).length;
    const total = batch.giftcards.length;
    const allConfirmed = confirmedCount === total && total > 0;

    if (isPaid) {
      return {
        label: "PAID",
        color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        icon: <CheckCircle2 className="w-4 h-4" />,
      };
    }
    if (allConfirmed) {
      return {
        label: "AWAITING PAYOUT",
        color: "bg-primary/20 text-primary border-primary/30",
        icon: <TrendingUp className="w-4 h-4" />,
      };
    }
    return {
      label: `PROCESSING (${confirmedCount}/${total})`,
      color: "bg-muted text-muted-foreground border-border",
      icon: <Clock className="w-4 h-4" />,
    };
  };

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Header & Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border space-y-2 group hover:border-primary/50 transition-all">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-sm font-black uppercase tracking-widest">Batches History</span>
            <History className="w-4 h-4 text-primary" />
          </div>
          <div className="text-4xl font-black italic tracking-tighter">{totalBatches}</div>
          <p className="text-sm text-muted-foreground italic">{totalCardsCount} cards total</p>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border space-y-2 group hover:border-blue-500/50 transition-all">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-sm font-black uppercase tracking-widest">Pending Payout</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-4xl font-black italic tracking-tighter text-blue-500">{awaitingPayoutCount}</div>
          <p className="text-sm text-muted-foreground italic">Batches ready for payment</p>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border space-y-2 group hover:border-emerald-500/50 transition-all">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-sm font-black uppercase tracking-widest">Total Earnings</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-4xl font-black italic tracking-tighter text-emerald-500">${totalPaid.toFixed(2)}</div>
          <p className="text-sm text-muted-foreground italic">Sent to your wallet</p>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border space-y-2 group hover:border-amber-500/50 transition-all">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-sm font-black uppercase tracking-widest">Gross Inventory</span>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-4xl font-black italic tracking-tighter text-amber-500">${totalVolume.toFixed(2)}</div>
          <p className="text-sm text-muted-foreground italic">Total nominal value loaded</p>
        </Card>
      </div>

      {/* 2. Filters & Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-3xl font-black italic tracking-tight uppercase">Dashboard History</h2>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Monitor your batches status in real-time</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search code or brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-muted/20 border-border font-medium"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44 h-10 bg-muted/20 border-border font-bold text-sm uppercase">
              <Filter className="w-3 h-3 mr-2" />
              <SelectValue placeholder="STATUS" />
            </SelectTrigger>
            <SelectContent className="bg-popover text-popover-foreground border-border">
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
              const hasReport = batch.giftcards.some((g) => g.isConfirmed && g.status !== "USED");

              return (
                <Card
                  key={batch.id}
                  className={`overflow-hidden border-border transition-all duration-300 ${isExpanded ? "ring-2 ring-primary/20 bg-background" : "hover:border-primary/30 bg-card/40"}`}
                >
                  {/* Batch Header */}
                  <div
                    onClick={() => setExpandedBatch(isExpanded ? null : batch.id)}
                    className="p-4 md:p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group relative"
                  >
                    {/* Progress Bar background */}
                    <div className="absolute top-0 left-0 h-1 bg-primary/10 w-full">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} className="h-full bg-primary/40" />
                    </div>

                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-xl ${status.color.includes("emerald") ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"} transition-colors shadow-sm`}
                      >
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black uppercase tracking-widest text-muted-foreground/50">ID</span>
                          <span className="text-sm font-mono font-bold">{batch.id.slice(-8).toUpperCase()}</span>
                        </div>
                        <div className="text-sm text-muted-foreground font-bold font-mono">
                          {new Date(batch.createdAt).toLocaleDateString()} AT{" "}
                          {new Date(batch.createdAt)
                            .toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                            .toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 md:gap-8">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground uppercase font-black tracking-widest mb-0.5">Confirmation</div>
                        <div className="text-base font-black italic tracking-tighter">
                          {confirmedCount}/{totalItems} Cnfrm.
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground uppercase font-black tracking-widest mb-0.5">Value</div>
                        <div className="text-base font-black text-primary italic tracking-tighter">${batchTotal.toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground uppercase font-black tracking-widest mb-0.5">Est. Payout</div>
                        <div className="text-base font-black text-emerald-500 italic tracking-tighter">${estimatedPayout.toFixed(2)}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        {hasReport && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="p-1 px-2 bg-destructive/10 text-destructive rounded flex items-center gap-1.5 animate-pulse">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span className="text-sm font-black">ISSUE</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-destructive text-destructive-foreground font-bold text-sm p-2">
                                <p>Some cards in this batch have been reported as invalid or used.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        <Badge className={`${status.color} px-3 py-1 font-black italic text-sm tracking-tight flex items-center gap-1.5`}>
                          {status.icon} {status.label}
                        </Badge>

                        <div className={`transition-transform duration-300 p-1 rounded-full bg-muted/20 ${isExpanded ? "rotate-180" : ""}`}>
                          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content (Cards) */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="border-t border-border bg-muted/5 font-medium"
                      >
                        <div className="p-4 space-y-2">
                          <div className="flex items-center gap-2 mb-4 px-2">
                            <Info className="w-3.5 h-3.5 text-primary" />
                            <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest">
                              Review card status and wait for buyers to confirm usage.
                            </p>
                          </div>

                          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-sm font-black uppercase tracking-widest text-muted-foreground/60">
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
                                className="grid grid-cols-1 md:grid-cols-12 gap-4 px-4 py-3 rounded-2xl bg-card border border-border/40 hover:border-primary/20 items-center group/card transition-all"
                              >
                                <div className="col-span-1 hidden md:block text-sm font-mono font-bold text-muted-foreground/40 italic">
                                  #{idx + 1}
                                </div>

                                <div className="col-span-3 flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-white relative overflow-hidden flex items-center justify-center border border-border/60 shadow-sm">
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
                                    <div className="text-sm font-black italic uppercase tracking-tight">{card.brand.name}</div>
                                    <div className="text-sm text-muted-foreground font-bold tracking-wide">
                                      {card.country?.name || "GLOBAL"}
                                    </div>
                                  </div>
                                </div>

                                <div className="col-span-3">
                                  <ClaimCodeField code={card.claimCode} />
                                </div>

                                <div className="col-span-2 text-base font-black italic">
                                  {card.isConfirmed && card.status !== "USED" ? (
                                    card.status === "WRONG_AMOUNT" && card.reportedAmount != null ? (
                                      <div className="flex flex-col">
                                        <span className="text-destructive/50 line-through text-sm">${card.amount.toFixed(2)}</span>
                                        <span className="text-amber-500">${card.reportedAmount.toFixed(2)}</span>
                                      </div>
                                    ) : (
                                      <span className="text-destructive line-through">${card.amount.toFixed(2)}</span>
                                    )
                                  ) : (
                                    <span className="text-primary">${card.amount.toFixed(2)}</span>
                                  )}
                                </div>

                                <div className="col-span-2"><GiftcardStatusBadge card={card} /></div>

                                <div className="col-span-1 text-right flex justify-end">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCard(card);
                                    }}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              </motion.div>
                            ))}
                          </div>

                          {/* Batch Payments Section */}
                          {batch.payments.length > 0 && (
                            <div className="mt-8 p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                              <h4 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-500 mb-4 inline-flex items-center gap-2">
                                <CreditCard className="w-3 h-3" /> Payout Information
                              </h4>
                              <div className="space-y-2.5">
                                {batch.payments.map((p) => (
                                  <div
                                    key={p.id}
                                    className="flex items-center justify-between text-sm px-2 py-2 bg-background/50 rounded-xl border border-emerald-500/10"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="font-mono font-black text-foreground uppercase tracking-tighter">
                                          TRX ID: {p.id.slice(-8).toUpperCase()}
                                        </span>
                                        <span className="text-sm text-muted-foreground font-bold">
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
              icon={<History className="w-12 h-12 text-muted-foreground/20" />}
              title="No records found"
              description="Try adjusting your filters or search keywords."
            />
          )}
        </AnimatePresence>
      </div>

      {/* 4. Details Dialog */}
      <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
        <DialogContent className="bg-card border-border sm:max-w-106.25 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black italic tracking-tighter uppercase">Card Details</DialogTitle>
          </DialogHeader>
          {selectedCard && (
            <div className="space-y-8 pt-4">
              <div className="p-5 bg-muted/30 rounded-3xl flex items-center gap-4 relative overflow-hidden">
                <div className="w-14 h-14 bg-white rounded-2xl relative overflow-hidden flex items-center justify-center shadow-md border border-border/50">
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
                  <h3 className="font-black text-2xl italic uppercase tracking-tighter leading-none mb-1">{selectedCard.brand.name}</h3>
                  <p className="text-sm text-muted-foreground font-bold tracking-widest uppercase">
                    {selectedCard.country?.name || "Global"}
                  </p>
                </div>
                <div className="text-right">
                  {selectedCard.isConfirmed && selectedCard.status !== "USED" ? (
                    selectedCard.status === "WRONG_AMOUNT" && selectedCard.reportedAmount != null ? (
                      <div className="space-y-1">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-black uppercase tracking-widest text-muted-foreground/60">Original</span>
                          <span className="text-xl font-black text-destructive/50 italic leading-none line-through">
                            ${selectedCard.amount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-black uppercase tracking-widest text-amber-500/80">Effective</span>
                          <span className="text-3xl font-black text-amber-500 italic leading-none">
                            ${selectedCard.reportedAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="text-3xl font-black text-destructive italic leading-none line-through">
                          ${selectedCard.amount.toFixed(2)}
                        </div>
                        <div className="text-sm font-black uppercase tracking-widest text-destructive/60">Voided</div>
                      </div>
                    )
                  ) : (
                    <div className="text-2xl font-black text-primary italic leading-none mb-1">${selectedCard.amount.toFixed(2)}</div>
                  )}
                  <div className="scale-90 origin-right mt-1"><GiftcardStatusBadge card={selectedCard} /></div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-base font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                    <Info className="w-3 h-3" /> Security Code
                  </span>
                  <div className="p-4 bg-muted/20 border border-border/60 rounded-2xl flex items-center justify-between group">
                    <code className="text-lg font-mono font-black tracking-widest text-foreground">{selectedCard.claimCode}</code>
                  </div>
                </div>

                {selectedCard.pinCode && (
                  <div className="space-y-2">
                    <span className="text-base font-black uppercase text-muted-foreground tracking-widest">Pin Access</span>
                    <div className="p-4 bg-muted/20 border border-border/60 rounded-2xl font-mono text-base font-black">
                      {selectedCard.pinCode}
                    </div>
                  </div>
                )}
              </div>

              {selectedCard.isConfirmed && selectedCard.status !== "USED" && (
                <div className="p-5 bg-destructive/10 border border-destructive/20 rounded-2xl flex gap-4 italic relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                  <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-1" />
                  <div className="space-y-1.5">
                    <p className="text-sm font-black text-destructive uppercase tracking-widest">Action Required</p>
                    <p className="text-base text-destructive/80 font-bold leading-relaxed uppercase">
                      THIS CARD WAS REPORTED AS <span className="underline">{selectedCard.status.replace("_", " ")}</span>. THE BUYER
                      CLAIMED AN ISSUE DURING REDEMPTION.
                    </p>
                  </div>
                </div>
              )}

              <Button
                onClick={() => setSelectedCard(null)}
                className="w-full h-14 font-black bg-primary text-primary-foreground text-xl italic uppercase shadow-xl shadow-primary/20 rounded-2xl transition-all active:scale-95"
              >
                Close View
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
