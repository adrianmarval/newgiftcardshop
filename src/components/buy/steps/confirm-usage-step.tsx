"use client";

import { motion } from "framer-motion";
import { Check, AlertCircle, ChevronRight, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBuyFlow } from "@/hooks/use-buy-flow";

export function ConfirmUsageStep() {
  const { 
    foundGiftcards, 
    setStep 
  } = useBuyFlow();

  const totalAmount = foundGiftcards.reduce((sum, card) => {
    if (card.status === "UNUSED") return sum + card.amount;
    if (card.status === "WRONG_AMOUNT") return sum + (card.reportedAmount ?? 0);
    return sum;
  }, 0);

  const reportedCards = foundGiftcards.filter(c => c.status !== "UNUSED");

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 h-full items-start">
      {/* Left Column: Confirmation Actions */}
      <Card className="md:col-span-12 border-border bg-card/50 backdrop-blur-sm p-4 md:p-8 space-y-6 md:space-y-8 flex flex-col items-center text-center">
        <div className="max-w-2xl space-y-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Check className="w-10 h-10 text-primary" />
          </motion.div>
          
          <h2 className="text-2xl md:text-3xl font-black tracking-tight italic">FINAL CONFIRMATION</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            You are about to confirm that you have used all cards correctly. 
            Once confirmed, you will proceed to payment and <strong>reporting will be disabled</strong>.
          </p>
        </div>

        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 border border-border rounded-2xl">
            <div className="text-[10px] text-muted-foreground uppercase font-black mb-1">Total Cards</div>
            <div className="text-2xl font-black">{foundGiftcards.length}</div>
          </div>
          <div className="p-4 bg-muted/50 border border-border rounded-2xl">
            <div className="text-[10px] text-muted-foreground uppercase font-black mb-1">Reported Issues</div>
            <div className={`text-2xl font-black ${reportedCards.length > 0 ? "text-destructive" : ""}`}>
              {reportedCards.length}
            </div>
          </div>
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl">
            <div className="text-[10px] text-primary uppercase font-black mb-1">Final Amount Due</div>
            <div className="text-2xl font-black text-primary">${totalAmount.toFixed(2)}</div>
          </div>
        </div>

        <div className="max-w-lg w-full p-4 bg-destructive/5 border border-destructive/20 rounded-xl flex gap-3 text-left">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-destructive uppercase">Important Disclaimer</p>
            <p className="text-[11px] text-destructive/80 leading-relaxed italic">
              Confirmation is irreversible. Ensure you have redemption screenshots or video evidence for all cards, especially those reported as having issues.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Button
            variant="ghost"
            onClick={() => setStep(3)}
            className="flex-1 h-12 text-sm font-bold text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Review
          </Button>
          <Button
            onClick={() => setStep(5)}
            className="flex-2 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xl shadow-primary/30 text-base"
          >
            Confirm & Proceed to Payment
          </Button>
        </div>
      </Card>
    </div>
  );
}
