"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Package, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Image from "next/image";
import { OrderDetails } from "./order-details";
import type { BuyerOrder, BuyerOrderGiftcard, OrderStatus } from "@/types";

interface OrderCardProps {
  order: BuyerOrder;
  onCardClick?: (card: BuyerOrderGiftcard, orderStatus: OrderStatus) => void;
}

// Status badge configuration
const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: "PENDING", color: "bg-amber-500/20 text-amber-500 border-amber-500/30", icon: null },
  AWAITING_PAYMENT: {
    label: "AWAITING PAYMENT",
    color: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    icon: null,
  },
  COMPLETED: {
    label: "COMPLETED",
    color: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
    icon: null,
  },
  CANCELLED: {
    label: "CANCELLED",
    color: "bg-destructive/20 text-destructive border-destructive/30",
    icon: null,
  },
};

export function OrderCard({ order, onCardClick }: OrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const confirmedCount = order.giftcards.filter((g) => g.isConfirmed).length;
  const totalItems = order.giftcards.length;
  const progressPercentage = totalItems > 0 ? (confirmedCount / totalItems) * 100 : 0;
  const hasIssues = order.giftcards.some((g) => g.isConfirmed && g.status !== "USED");
  const canCancel = order.effectiveTotal === 0 && (order.status === "PENDING" || order.status === "AWAITING_PAYMENT");
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
      className={`overflow-hidden border-border transition-all duration-300 ${isExpanded ? "ring-2 ring-primary/20 bg-background" : "hover:border-primary/30 bg-card/40"}`}
    >
      {/* Order Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
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

            <Badge className={`${status.color} px-3 py-1 font-black italic text-sm tracking-tight flex items-center gap-1.5`}>
              {status.label}
            </Badge>

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
            <OrderDetails order={order} canCancel={canCancel} onCardClick={onCardClick} />
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
