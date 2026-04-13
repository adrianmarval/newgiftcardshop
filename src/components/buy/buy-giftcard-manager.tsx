"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { useBuyFlow } from "@/hooks/use-buy-flow";
import { SearchStep } from "./steps/search-step";
import { ResultsStep } from "./steps/results-step";
import { RedeemStep } from "./steps/redeem-step";
import { ConfirmUsageStep } from "./steps/confirm-usage-step";
import { PaymentStep } from "./steps/payment-step";
import type { Brand, Country } from "@/types";

interface BuyGiftcardManagerProps {
  brands: Brand[];
  countries: Country[];
}

export function BuyGiftcardManager({ brands, countries }: BuyGiftcardManagerProps) {
  const { step } = useBuyFlow();

  return (
    <div className="w-full space-y-4 md:space-y-6 px-0 md:px-0 py-2 md:py-0">
      {/* Header & Progress combined */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-card/40 px-3 py-4 md:p-6 rounded-none md:rounded-xl border-y md:border border-border backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col">
          <h1 className="text-3xl md:text-4xl font-bold mb-0.5 md:mb-1">Buy Gift Cards</h1>
          <p className="text-muted-foreground text-sm md:text-base">Find and purchase gift cards at the best rates.</p>
        </motion.div>

        {/* Multi-step Progress */}
        <div className="flex items-center gap-2 md:gap-4 pb-2 md:pb-0 no-scrollbar">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center">
              <div className="relative group">
                <motion.div
                  className={`
                    w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-base font-bold
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
                  absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs md:text-sm uppercase tracking-wider font-bold whitespace-nowrap
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
      <div className="min-h-125 md:min-h-150 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {step === 1 && <SearchStep brands={brands} countries={countries} />}
            {step === 2 && <ResultsStep />}
            {step === 3 && <RedeemStep />}
            {step === 4 && <ConfirmUsageStep />}
            {step === 5 && <PaymentStep />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
