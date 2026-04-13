"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  History,
  Info,
  Package,
  XCircle,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Image from "next/image";
import { toast } from "sonner";
import type { BuyerOrder, BuyerOrderGiftcard, BuyerOrdersViewProps, OrderStatus } from "@/types";
import { cancelOrder } from "@/actions/order-actions";

export function BuyerOrdersView({ orders, pagination, currentFilters }: BuyerOrdersViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<{ card: BuyerOrderGiftcard; orderStatus: OrderStatus } | null>(null);
  const [searchTerm, setSearchTerm] = useState(currentFilters.search || "");
  const [statusFilter, setStatusFilter] = useState<string>(currentFilters.status || "ALL");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">(currentFilters.sort);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);

  // Stats calculations
  const totalOrders = orders.length;
  const activeOrders = orders.filter((o) => o.status === "PENDING" || o.status === "AWAITING_PAYMENT").length;
  const completedOrders = orders.filter((o) => o.status === "COMPLETED").length;
  const totalSpent = orders.filter((o) => o.status === "COMPLETED").reduce((acc, o) => acc + (o.adjustedTotal ?? o.total), 0);

  // Filtering Logic (client-side for display, server-side for pagination)
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [orders, searchTerm]);

  // Status badge configuration
  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING: { label: "PENDING", color: "bg-amber-500/20 text-amber-500 border-amber-500/30", icon: <Clock className="w-4 h-4" /> },
    AWAITING_PAYMENT: {
      label: "AWAITING PAYMENT",
      color: "bg-blue-500/20 text-blue-500 border-blue-500/30",
      icon: <Clock className="w-4 h-4" />,
    },
    COMPLETED: {
      label: "COMPLETED",
      color: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    CANCELLED: {
      label: "CANCELLED",
      color: "bg-destructive/20 text-destructive border-destructive/30",
      icon: <XCircle className="w-4 h-4" />,
    },
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, color: "bg-muted text-muted-foreground", icon: null };
    return (
      <Badge className={`${config.color} px-3 py-1 font-black italic text-sm tracking-tight flex items-center gap-1.5`}>
        {config.icon} {config.label}
      </Badge>
    );
  };

  const getCardStatusBadge = (card: BuyerOrderGiftcard, orderStatus: OrderStatus) => {
    const reportLabels: Record<string, string> = {
      INVALID: "Invalid",
      ALREADY_USED: "Already Used",
      DEACTIVATED: "Deactivated",
      WRONG_AMOUNT: "Wrong Amount",
      UNUSED: "Unused",
      USED: "Used",
    };

    if (orderStatus === "CANCELLED") {
      return (
        <Badge className="bg-muted text-muted-foreground hover:bg-muted border-border gap-1.5">
          <XCircle className="w-3 h-3" /> Cancelled
        </Badge>
      );
    }

    if (card.isConfirmed) {
      if (card.status === "USED") {
        return (
          <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/30 gap-1.5">
            <CheckCircle2 className="w-3 h-3" /> Confirmed
          </Badge>
        );
      }

      const label = reportLabels[card.status] || card.status.replace("_", " ");
      const isWrongAmount = card.status === "WRONG_AMOUNT";

      return (
        <Badge
          className={`${isWrongAmount ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/20 border-amber-500/30" : "bg-destructive/20 text-destructive hover:bg-destructive/20 border-destructive/30"} gap-1.5`}
        >
          <AlertTriangle className="w-3 h-3" /> {label}
        </Badge>
      );
    }

    if (card.orderId) {
      return (
        <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/20 border-blue-500/30 animate-pulse gap-1.5">
          <Clock className="w-3 h-3" /> Taken (Pending)
        </Badge>
      );
    }

    return (
      <Badge className="bg-muted text-muted-foreground hover:bg-muted border-border gap-1.5">
        <Package className="w-3 h-3" /> Available
      </Badge>
    );
  };

  // URL param sync
  const updateFilters = (partial: Partial<{ status: string; search: string; sort: "newest" | "oldest" }>) => {
    const params = new URLSearchParams(searchParams.toString());

    if (partial.status !== undefined) {
      if (partial.status === "ALL") {
        params.delete("status");
      } else {
        params.set("status", partial.status);
      }
    }
    if (partial.search !== undefined) {
      if (partial.search) {
        params.set("search", partial.search);
      } else {
        params.delete("search");
      }
    }
    if (partial.sort !== undefined) {
      params.set("sort", partial.sort);
    }
    params.delete("page"); // Reset to page 1 on filter change

    router.push(`/buy/dashboard/orders?${params.toString()}`);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    updateFilters({ status: value });
  };

  const handleSortChange = (value: "newest" | "oldest") => {
    setSortOrder(value);
    updateFilters({ sort: value });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchTerm });
  };

  // Cancel order handler
  const handleCancelOrder = async (orderId: string) => {
    setIsCancelling(orderId);
    try {
      const result = await cancelOrder({ orderId });
      if (result.serverError || result.validationErrors) {
        toast.error("Failed to cancel order", {
          description: (result.serverError || result.validationErrors?._errors) as string,
        });
      } else {
        toast.success("Order cancelled successfully!");
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to cancel order", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsCancelling(null);
    }
  };

  // Check if order can be cancelled (effectiveTotal === 0 and status allows)
  const canCancelOrder = (order: BuyerOrder) => {
    return order.effectiveTotal === 0 && (order.status === "PENDING" || order.status === "AWAITING_PAYMENT");
  };

  // Resume order navigation
  const handleResumeOrder = (orderId: string) => {
    router.push(`/buy/dashboard/browse-cards?orderId=${orderId}`);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Header & Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border space-y-2 group hover:border-primary/50 transition-all">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-sm font-black uppercase tracking-widest">Total Orders</span>
            <History className="w-4 h-4 text-primary" />
          </div>
          <div className="text-4xl font-black italic tracking-tighter">{totalOrders}</div>
          <p className="text-sm text-muted-foreground italic">{pagination.totalCount} orders found</p>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border space-y-2 group hover:border-amber-500/50 transition-all">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-sm font-black uppercase tracking-widest">Active Orders</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-4xl font-black italic tracking-tighter text-amber-500">{activeOrders}</div>
          <p className="text-sm text-muted-foreground italic">Pending or awaiting payment</p>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border space-y-2 group hover:border-emerald-500/50 transition-all">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-sm font-black uppercase tracking-widest">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-4xl font-black italic tracking-tighter text-emerald-500">{completedOrders}</div>
          <p className="text-sm text-muted-foreground italic">Orders fulfilled</p>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border space-y-2 group hover:border-blue-500/50 transition-all">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-sm font-black uppercase tracking-widest">Total Spent</span>
            <CreditCard className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-4xl font-black italic tracking-tighter text-blue-500">${totalSpent.toFixed(2)}</div>
          <p className="text-sm text-muted-foreground italic">On completed orders</p>
        </Card>
      </div>

      {/* 2. Filters & Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-3xl font-black italic tracking-tight uppercase">Order History</h2>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Track your purchases in real-time</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <form onSubmit={handleSearch} className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-muted/20 border-border font-medium"
            />
          </form>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-44 h-10 bg-muted/20 border-border font-bold text-sm uppercase">
              <Filter className="w-3 h-3 mr-2" />
              <SelectValue placeholder="STATUS" />
            </SelectTrigger>
            <SelectContent className="bg-popover text-popover-foreground border-border">
              <SelectItem value="ALL">ALL ORDERS</SelectItem>
              <SelectItem value="PENDING">PENDING</SelectItem>
              <SelectItem value="AWAITING_PAYMENT">AWAITING PAYMENT</SelectItem>
              <SelectItem value="COMPLETED">COMPLETED</SelectItem>
              <SelectItem value="CANCELLED">CANCELLED</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full sm:w-36 h-10 bg-muted/20 border-border font-bold text-sm uppercase">
              <SelectValue placeholder="SORT" />
            </SelectTrigger>
            <SelectContent className="bg-popover text-popover-foreground border-border">
              <SelectItem value="newest">NEWEST</SelectItem>
              <SelectItem value="oldest">OLDEST</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3. Order List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => {
              const isExpanded = expandedOrder === order.id;
              const confirmedCount = order.giftcards.filter((g) => g.isConfirmed).length;
              const totalItems = order.giftcards.length;
              const progressPercentage = totalItems > 0 ? (confirmedCount / totalItems) * 100 : 0;
              const hasIssues = order.giftcards.some((g) => g.isConfirmed && g.status !== "USED");
              const canCancel = canCancelOrder(order);
              const status = statusConfig[order.status] || { label: order.status, color: "bg-muted" };

              // Get unique brands (up to 3)
              const uniqueBrands = order.giftcards.reduce(
                (acc, g) => {
                  if (!acc.find((b) => b.name === g.brand.name)) {
                    acc.push(g.brand);
                  }
                  return acc;
                },
                [] as BuyerOrderGiftcard["brand"][],
              );
              const brandIcons = uniqueBrands.slice(0, 3);
              const extraBrands = uniqueBrands.length - 3;

              return (
                <Card
                  key={order.id}
                  className={`overflow-hidden border-border transition-all duration-300 ${isExpanded ? "ring-2 ring-primary/20 bg-background" : "hover:border-primary/30 bg-card/40"}`}
                >
                  {/* Order Header */}
                  <div
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    className="p-4 md:p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group relative"
                  >
                    {/* Progress Bar background */}
                    <div className="absolute top-0 left-0 h-1 bg-primary/10 w-full">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} className="h-full bg-primary/40" />
                    </div>

                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-xl ${status.color.includes("emerald") ? "bg-emerald-500/10 text-emerald-500" : status.color.includes("amber") ? "bg-amber-500/10 text-amber-500" : status.color.includes("blue") ? "bg-blue-500/10 text-blue-500" : status.color.includes("destructive") ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"} transition-colors shadow-sm`}
                      >
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black uppercase tracking-widest text-muted-foreground/50">ID</span>
                          <span className="text-sm font-mono font-bold">{order.id.slice(-8).toUpperCase()}</span>
                        </div>
                        <div className="text-sm text-muted-foreground font-bold font-mono">
                          {new Date(order.createdAt).toLocaleDateString()} AT{" "}
                          {new Date(order.createdAt)
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
                        <div className="text-sm text-muted-foreground uppercase font-black tracking-widest mb-0.5">Cards</div>
                        <div className="text-base font-black italic tracking-tighter">
                          {confirmedCount}/{totalItems} Cnfrm.
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground uppercase font-black tracking-widest mb-0.5">Total</div>
                        <div className="text-base font-black text-primary italic tracking-tighter">
                          ${(order.adjustedTotal ?? order.total).toFixed(2)}
                        </div>
                      </div>

                      {/* Brand icons */}
                      <div className="flex items-center gap-1">
                        {brandIcons.map((brand, idx) => (
                          <div
                            key={idx}
                            className="w-8 h-8 rounded-lg bg-white relative overflow-hidden flex items-center justify-center border border-border/60 shadow-sm"
                          >
                            {brand.image ? (
                              <Image src={brand.image} alt={brand.name} fill className="object-contain p-1" loading="eager" />
                            ) : (
                              <span className="text-lg">{brand.icon}</span>
                            )}
                          </div>
                        ))}
                        {extraBrands > 0 && (
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-black">
                            +{extraBrands}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {hasIssues && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="p-1 px-2 bg-destructive/10 text-destructive rounded flex items-center gap-1.5 animate-pulse">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span className="text-sm font-black">ISSUE</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-destructive text-destructive-foreground font-bold text-sm p-2">
                                <p>Some cards in this order have been reported as invalid or used.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {getStatusBadge(order.status)}

                        <div className={`transition-transform duration-300 p-1 rounded-full bg-muted/20 ${isExpanded ? "rotate-180" : ""}`}>
                          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content (Order Details) */}
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
                              Review your order details below.
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
                            {order.giftcards.map((card, idx) => (
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
                                  <CodeDisplay code={card.claimCode} />
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

                                <div className="col-span-2">{getCardStatusBadge(card, order.status)}</div>

                                <div className="col-span-1 text-right flex justify-end">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCard({ card, orderStatus: order.status });
                                    }}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              </motion.div>
                            ))}
                          </div>

                          {/* Order Payments Section */}
                          {order.payments.length > 0 && (
                            <div className="mt-8 p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                              <h4 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-500 mb-4 inline-flex items-center gap-2">
                                <CreditCard className="w-3 h-3" /> Payment Information
                              </h4>
                              <div className="space-y-2.5">
                                {order.payments.map((p) => (
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

                          {/* Action Buttons */}
                          <div className="mt-6 flex flex-wrap gap-3 justify-end">
                            {/* Resume button - only for PENDING and AWAITING_PAYMENT */}
                            {(order.status === "PENDING" || order.status === "AWAITING_PAYMENT") && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResumeOrder(order.id);
                                }}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Resume Order
                              </Button>
                            )}

                            {/* Cancel button - only for PENDING and AWAITING_PAYMENT */}
                            {(order.status === "PENDING" || order.status === "AWAITING_PAYMENT") && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancelOrder(order.id);
                                        }}
                                        disabled={!canCancel || isCancelling === order.id}
                                        variant="outline"
                                        className="border-destructive/50 text-destructive hover:bg-destructive/10"
                                      >
                                        {isCancelling === order.id ? (
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                          <XCircle className="w-4 h-4 mr-2" />
                                        )}
                                        Cancel Order
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  {!canCancel && (
                                    <TooltipContent className="bg-destructive text-destructive-foreground font-bold text-sm p-2">
                                      <p>Cannot cancel: order has cards with value. Wait for completion or contact support.</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              );
            })
          ) : (
            <div className="pt-24 pb-24 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center">
                <History className="w-12 h-12 text-muted-foreground/20" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-3xl font-black italic tracking-tight uppercase">No records found</h3>
                <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest leading-relaxed px-10">
                  Try adjusting your filters or search keywords.
                </p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="outline"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(pagination.currentPage - 1));
              router.push(`/buy/dashboard/orders?${params.toString()}`);
            }}
            disabled={pagination.currentPage <= 1}
            className="border-border font-bold"
          >
            Previous
          </Button>
          <span className="text-sm font-black uppercase tracking-widest">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(pagination.currentPage + 1));
              router.push(`/buy/dashboard/orders?${params.toString()}`);
            }}
            disabled={pagination.currentPage >= pagination.totalPages}
            className="border-border font-bold"
          >
            Next
          </Button>
        </div>
      )}

      {/* 5. Details Dialog */}
      <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
        <DialogContent className="bg-card border-border sm:max-w-106.25 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black italic tracking-tighter uppercase">Card Details</DialogTitle>
          </DialogHeader>
          {selectedCard && (
            <div className="space-y-8 pt-4">
              <div className="p-5 bg-muted/30 rounded-3xl flex items-center gap-4 relative overflow-hidden">
                <div className="w-14 h-14 bg-white rounded-2xl relative overflow-hidden flex items-center justify-center shadow-md border border-border/50">
                  {selectedCard.card.brand.image ? (
                    <Image
                      src={selectedCard.card.brand.image}
                      alt={selectedCard.card.brand.name}
                      fill
                      className="object-contain p-1"
                      loading="eager"
                    />
                  ) : (
                    <span className="text-3xl">{selectedCard.card.brand.icon}</span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-2xl italic uppercase tracking-tighter leading-none mb-1">
                    {selectedCard.card.brand.name}
                  </h3>
                  <p className="text-sm text-muted-foreground font-bold tracking-widest uppercase">
                    {selectedCard.card.country?.name || "Global"}
                  </p>
                </div>
                <div className="text-right">
                  {selectedCard.card.isConfirmed && selectedCard.card.status !== "USED" ? (
                    selectedCard.card.status === "WRONG_AMOUNT" && selectedCard.card.reportedAmount != null ? (
                      <div className="space-y-1">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-black uppercase tracking-widest text-muted-foreground/60">Original</span>
                          <span className="text-xl font-black text-destructive/50 italic leading-none line-through">
                            ${selectedCard.card.amount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-black uppercase tracking-widest text-amber-500/80">Effective</span>
                          <span className="text-3xl font-black text-amber-500 italic leading-none">
                            ${selectedCard.card.reportedAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="text-3xl font-black text-destructive italic leading-none line-through">
                          ${selectedCard.card.amount.toFixed(2)}
                        </div>
                        <div className="text-sm font-black uppercase tracking-widest text-destructive/60">Voided</div>
                      </div>
                    )
                  ) : (
                    <div className="text-2xl font-black text-primary italic leading-none mb-1">${selectedCard.card.amount.toFixed(2)}</div>
                  )}
                  <div className="scale-90 origin-right mt-1">{getCardStatusBadge(selectedCard.card, selectedCard.orderStatus)}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-base font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                    <Info className="w-3 h-3" /> Claim Code
                  </span>
                  <div className="p-4 bg-muted/20 border border-border/60 rounded-2xl overflow-hidden">
                    <code className="text-sm font-mono font-black tracking-tight text-foreground break-all">
                      {selectedCard.card.claimCode}
                    </code>
                  </div>
                </div>

                {selectedCard.card.pinCode && (
                  <div className="space-y-2">
                    <span className="text-base font-black uppercase text-muted-foreground tracking-widest">Pin Access</span>
                    <div className="p-4 bg-muted/20 border border-border/60 rounded-2xl font-mono text-sm font-black break-all overflow-hidden">
                      {selectedCard.card.pinCode}
                    </div>
                  </div>
                )}
              </div>

              {selectedCard.card.isConfirmed && selectedCard.card.status !== "USED" && (
                <div className="p-5 bg-destructive/10 border border-destructive/20 rounded-2xl flex gap-4 italic relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                  <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-1" />
                  <div className="space-y-1.5">
                    <p className="text-sm font-black text-destructive uppercase tracking-widest">Action Required</p>
                    <p className="text-base text-destructive/80 font-bold leading-relaxed uppercase">
                      THIS CARD WAS REPORTED AS <span className="underline">{selectedCard.card.status.replace("_", " ")}</span>. AN ISSUE
                      WAS CLAIMED DURING REDEMPTION.
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

function CodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <code
              onClick={copy}
              className="text-base font-mono bg-muted/60 px-2.5 py-1 rounded-lg border border-border/60 cursor-pointer hover:bg-muted transition-colors font-bold tracking-tight text-foreground truncate max-w-35"
            >
              {code.slice(0, 4)}••••{code.slice(-4)}
            </code>
          </TooltipTrigger>
          <TooltipContent className="bg-background border-border text-sm font-bold">
            <p>Click to copy: {code}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <button
        onClick={(e) => {
          e.stopPropagation();
          copy();
        }}
        className="text-sm text-primary/70 hover:text-primary transition-colors font-black uppercase tracking-widest"
      >
        {copied ? "DONE!" : "COPY"}
      </button>
    </div>
  );
}
