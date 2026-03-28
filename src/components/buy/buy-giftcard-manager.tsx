"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBuyFlow } from "@/hooks/use-buy-flow";
import { SearchStep } from "./steps/search-step";
import { ResultsStep } from "./steps/results-step";
import { RedeemStep } from "./steps/redeem-step";
import { ConfirmUsageStep } from "./steps/confirm-usage-step";
import { PaymentStep } from "./steps/payment-step";

export function BuyGiftcardManager() {
  const { step, resetForm, foundGiftcards } = useBuyFlow();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFinishSuccess = () => {
    setShowSuccessDialog(false);
    resetForm();
  };

  const totalCards = foundGiftcards.length;

  return (
    <div className="w-full space-y-4 md:space-y-6 px-0 md:px-0 py-2 md:py-0">
      {/* Header & Progress combined */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-card/40 px-3 py-4 md:p-6 rounded-none md:rounded-xl border-y md:border border-border backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col">
          <h1 className="text-2xl md:text-3xl font-bold mb-0.5 md:mb-1">Buy Gift Cards</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Find and purchase gift cards at the best rates.</p>
        </motion.div>

        {/* Multi-step Progress */}
        <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center">
              <div className="relative group">
                <motion.div
                  className={`
                    w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-bold
                    transition-all border-2
                    ${
                      s === step
                        ? "bg-primary border-primary/50 text-white shadow-lg shadow-primary/30"
                        : s < step
                          ? "bg-primary/20 border-primary/50 text-primary"
                          : "bg-muted/50 border-border text-muted-foreground/50"
                    }
                  `}
                  animate={{ scale: s === step ? 1.05 : 1 }}
                >
                  {s < step ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : s}
                </motion.div>
                <span
                  className={`
                  absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] md:text-[10px] uppercase tracking-wider font-bold whitespace-nowrap
                  hidden sm:block
                  ${s === step ? "text-primary" : "text-muted-foreground/70"}
                `}
                >
                  {s === 1 ? "Search" : s === 2 ? "Select" : s === 3 ? "Redeem" : s === 4 ? "Usage" : "Pay"}
                </span>
              </div>
              {s < 5 && (
                <div
                  className={`
                    h-0.5 w-4 md:w-8 mx-1 md:mx-2 rounded-full transition-all
                    ${s < step ? "bg-primary/50" : "bg-muted"}
                  `}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Steps Content */}
      <div className="min-h-[500px] md:min-h-[600px] relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {step === 1 && <SearchStep />}
            {step === 2 && <ResultsStep />}
            {step === 3 && <RedeemStep />}
            {step === 4 && <ConfirmUsageStep />}
            {step === 5 && <PaymentStep />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Success Dialog */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="mx-auto mb-4"
            >
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-primary" />
              </div>
            </motion.div>
            <AlertDialogTitle className="text-center text-2xl">Purchase Notified!</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-center text-lg">
              We have received your payment check for Order #{Math.random().toString(36).substring(7).toUpperCase()}. Your balance will be
              updated soon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={handleFinishSuccess} className="bg-primary hover:bg-primary/90 text-primary-foreground mt-4 h-11">
            Back to Dashboard
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
