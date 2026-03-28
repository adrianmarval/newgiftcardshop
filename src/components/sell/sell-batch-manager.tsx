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
import { useSellFlow } from "@/hooks/use-sell-flow";
import { BrandStep } from "./steps/brand-step";
import { DetailsStep } from "./steps/details-step";
import { ReviewStep } from "./steps/review-step";

export function SellBatchManager() {
  const { step, resetForm, giftcards } = useSellFlow();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);

    // Simulating API call - In the next phase we will replace this with a Server Action
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsPublishing(false);
    setShowSuccessDialog(true);
  };

  const handleFinishSuccess = () => {
    setShowSuccessDialog(false);
    resetForm();
  };

  const totalCards = giftcards.length;

  return (
    <div className="w-full space-y-4 md:space-y-6 px-0 md:px-0 py-2 md:py-0">
      {/* Header & Progress combined */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-card/40 px-3 py-4 md:p-6 rounded-none md:rounded-xl border-y md:border border-border backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-2xl md:text-3xl font-bold mb-0.5 md:mb-1">Sell Gift Cards</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Create a new batch of gift cards to sell.</p>
        </motion.div>

        {/* Compact Progress Steps */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center md:justify-end"
        >
          <div className="flex items-center gap-1 md:gap-2">
            {[1, 2, 3].map((s, idx) => (
              <div key={s} className="flex items-center">
                <div className="relative group">
                  <motion.div
                    className={`
                      w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-[10px] md:text-xs
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
                  {/* Tooltip-like label - Hidden on XS mobile */}
                  <span
                    className={`
                    absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] md:text-[10px] uppercase tracking-wider font-bold whitespace-nowrap
                    hidden sm:block
                    ${s === step ? "text-primary" : "text-muted-foreground/70"}
                  `}
                  >
                    {s === 1 ? "Brand" : s === 2 ? "Details" : "Review"}
                  </span>
                </div>
                {idx < 2 && (
                  <div
                    className={`
                      h-0.5 w-4 md:w-8 rounded-full transition-all
                      ${s < step ? "bg-primary/50" : "bg-muted"}
                    `}
                  />
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <BrandStep />
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <DetailsStep />
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ReviewStep onPublish={handlePublish} isPublishing={isPublishing} />
          </motion.div>
        )}
      </AnimatePresence>

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
            <AlertDialogTitle className="text-center text-2xl">Batch Published Successfully!</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-center text-lg">
              Your batch with {totalCards} gift card{totalCards !== 1 ? "s" : ""} has been submitted for verification.
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
