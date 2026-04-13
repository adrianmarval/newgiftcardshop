"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Info, XCircle, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Image from "next/image";
import { toast } from "sonner";
import { cancelOrder } from "@/actions/order-actions";
import { ClaimCodeField } from "@/components/ui/claim-code-field";
import { GiftcardStatusBadge } from "@/components/ui/giftcard-status-badge";
import { TransactionList } from "@/components/ui/transaction-list";
import type { BuyerOrder, BuyerOrderGiftcard } from "@/types";

interface OrderDetailsProps {
  order: BuyerOrder;
  canCancel: boolean;
  onCardClick?: (card: BuyerOrderGiftcard, orderStatus: BuyerOrder["status"]) => void;
}

export function OrderDetails({ order, canCancel, onCardClick }: OrderDetailsProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelOrder({ orderId: order.id });
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
      setIsCancelling(false);
    }
  };

  const handleResumeOrder = () => {
    router.push(`/buy/dashboard/browse-cards?orderId=${order.id}`);
  };

  return (
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

            <div className="col-span-2">
              <GiftcardStatusBadge card={card} orderStatus={order.status} />
            </div>

            <div className="col-span-1 text-right flex justify-end">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  onCardClick?.(card, order.status);
                }}
              >
                <span className="sr-only">View details</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Order Payments Section */}
      <TransactionList payments={order.payments} />

      {/* Action Buttons */}
      <div className="mt-6 flex flex-wrap gap-3 justify-end">
        {/* Resume button - only for PENDING and AWAITING_PAYMENT */}
        {(order.status === "PENDING" || order.status === "AWAITING_PAYMENT") && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleResumeOrder();
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
                      handleCancelOrder();
                    }}
                    disabled={!canCancel || isCancelling}
                    variant="outline"
                    className="border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    {isCancelling ? (
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
  );
}
