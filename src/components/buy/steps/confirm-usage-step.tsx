"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, AlertCircle, ArrowLeft, Loader2, XCircle, Ban } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBuyFlow } from "@/hooks/use-buy-flow";
import { getUserBuyRate, confirmOrderUsage, cancelOrder } from "@/actions/order-actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ConfirmUsageStep() {
  const { foundGiftcards, setStep, orderId, setAdjustedTotal, resetForm } = useBuyFlow();
  const router = useRouter();
  const [buyRate, setBuyRate] = useState(0.85);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getUserBuyRate().then((response) => {
      const rate = response.data;
      if (!rate) {
        toast.error("Error al obtener la tasa de compra", { description: response.serverError || response.validationErrors?.formErrors });
        return;
      }
      setBuyRate(rate);
    });
  }, []);

  const rawTotal = foundGiftcards.reduce((sum, card) => {
    if (card.status === "UNUSED") return sum + card.amount;
    if (card.status === "WRONG_AMOUNT") return sum + (card.reportedAmount ?? 0);
    return sum;
  }, 0);

  const totalAmount = rawTotal * buyRate;

  const handleConfirmUsage = async () => {
    if (!orderId) return;
    setIsUpdating(true);
    setErrorMessage(null);
    const result = await confirmOrderUsage({ orderId });
    if (!result.data) {
      toast.error("Error al confirmar uso de tarjetas", {
        description: result.serverError || result.validationErrors?._errors,
      });
      setErrorMessage(result.serverError || result.validationErrors?._errors?.join("") || "Error al confirmar uso de tarjetas");
      return;
    }
    if (result.data?.adjustedTotal) {
      setAdjustedTotal(result.data.adjustedTotal);
    }
    setStep(5);
    setIsUpdating(false);
  };

  const reportedCards = foundGiftcards.filter((c) => c.status !== "UNUSED");
  const allCardsWorthless = totalAmount === 0 && foundGiftcards.length > 0;

  const handleCancelOrder = async () => {
    if (!orderId) return;
    setIsCancelling(true);
    setErrorMessage(null);
    const result = await cancelOrder({ orderId });
    if (result.serverError || result.validationErrors) {
      toast.error("Failed to cancel order", {
        description: (result.serverError || result.validationErrors?._errors) as string,
      });
      setErrorMessage(result.serverError || "Failed to cancel order");
      setIsCancelling(false);
      return;
    }
    toast.success("Order cancelled successfully");
    resetForm();
    router.push("/buy/dashboard/orders");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 h-full items-start">
      {/* Full-width Confirmation Panel */}
      <Card className="md:col-span-12 border-border bg-card/50 backdrop-blur-sm p-4 md:p-8 space-y-6 md:space-y-8 flex flex-col items-center text-center">
        <div className="max-w-2xl space-y-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${allCardsWorthless ? "bg-destructive/10" : "bg-primary/10"}`}
          >
            {allCardsWorthless ? <Ban className="w-10 h-10 text-destructive" /> : <Check className="w-10 h-10 text-primary" />}
          </motion.div>

          {allCardsWorthless ? (
            <>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight italic">ALL CARDS REPORTED</h2>
              <p className="text-muted-foreground text-base md:text-lg">
                Every card in this order has been reported as invalid. There is <strong>nothing to pay</strong>. You can cancel this
                order or go back to review your reports.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight italic">FINAL CONFIRMATION</h2>
              <p className="text-muted-foreground text-base md:text-lg">
                You are about to confirm that you have used all cards correctly. Once confirmed, you will proceed to payment and{" "}
                <strong>reporting will be disabled</strong>.
              </p>
            </>
          )}
        </div>

        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 border border-border rounded-2xl">
            <div className="text-xs text-muted-foreground uppercase font-black mb-1">Total Cards</div>
            <div className="text-3xl font-black">{foundGiftcards.length}</div>
          </div>
          <div className="p-4 bg-muted/50 border border-border rounded-2xl">
            <div className="text-xs text-muted-foreground uppercase font-black mb-1">Reported Issues</div>
            <div className={`text-3xl font-black ${reportedCards.length > 0 ? "text-destructive" : ""}`}>{reportedCards.length}</div>
          </div>
          <div className={`p-4 rounded-2xl ${allCardsWorthless ? "bg-destructive/10 border border-destructive/20" : "bg-primary/10 border border-primary/20"}`}>
            <div className={`text-xs uppercase font-black mb-1 ${allCardsWorthless ? "text-destructive" : "text-primary"}`}>Final Amount Due</div>
            <div className={`text-3xl font-black ${allCardsWorthless ? "text-destructive" : "text-primary"}`}>${totalAmount.toFixed(2)}</div>
          </div>
        </div>

        {allCardsWorthless ? (
          <div className="max-w-lg w-full p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-3 text-left">
            <XCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-500 uppercase">No valid cards remaining</p>
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                All cards have been reported as invalid, already used, or deactivated. You can cancel this order at no cost, or go
                back to adjust your reports if you made a mistake.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-lg w-full p-4 bg-destructive/5 border border-destructive/20 rounded-xl flex gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-destructive uppercase">Important Disclaimer</p>
              <p className="text-sm text-destructive/80 leading-relaxed italic">
                Confirmation is irreversible. Ensure you have redemption screenshots or video evidence for all cards, especially those
                reported as having issues.
              </p>
            </div>
          </div>
        )}

        {errorMessage && <p className="text-sm text-destructive font-medium">{errorMessage}</p>}

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Button
            variant="ghost"
            onClick={() => setStep(3)}
            className="flex-1 h-12 text-sm font-bold text-muted-foreground hover:bg-muted"
            disabled={isUpdating || isCancelling}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Review
          </Button>

          {allCardsWorthless ? (
            <Button
              onClick={handleCancelOrder}
              disabled={isCancelling || !orderId}
              className="flex-2 h-12 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold shadow-xl shadow-destructive/30 text-base"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" /> Cancel Order
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleConfirmUsage}
              disabled={isUpdating || !orderId}
              className="flex-2 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xl shadow-primary/30 text-base"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirming...
                </>
              ) : (
                "Confirm & Proceed to Payment"
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
