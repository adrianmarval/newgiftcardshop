'use client';

import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { useBuyFlow } from '@/hooks/use-buy-flow';
import { SearchStep } from '@/components/buy/steps/search-step';
import { ResultsStep } from '@/components/buy/steps/results-step';
import { RedeemStep } from '@/components/buy/steps/redeem-step';
import { ConfirmUsageStep } from '@/components/buy/steps/confirm-usage-step';
import { PaymentStep } from '@/components/buy/steps/payment-step';
import type { BuyFlowGiftcard, BuyFlowGiftcardStatus } from '@/types';
import type { BuyGiftcardManagerProps } from './types';

const STEP_LABELS = ['Buscar', 'Seleccionar', 'Redimir', 'Uso', 'Pagar'];

export const BuyGiftcardManager = ({ brands, countries, resumeOrder }: BuyGiftcardManagerProps) => {
  const { step } = useBuyFlow();

  // Sync store ONCE per mount / per orderId change — synchronously before first paint
  const syncedRef = useRef<string | null>(null);
  const targetKey = resumeOrder?.id ?? 'fresh';

  if (syncedRef.current !== targetKey) {
    syncedRef.current = targetKey;

    if (resumeOrder) {
      const giftcards: BuyFlowGiftcard[] = resumeOrder.giftcards.map((card) => ({
        id: card.id,
        brand: card.brand.name,
        amount: card.amount,
        claimCode: card.claimCode,
        pinCode: card.pinCode || undefined,
        status: card.status as BuyFlowGiftcardStatus,
        reportedAmount: card.reportedAmount ?? undefined,
      }));

      let resumeStep = 1;
      if (resumeOrder.status === 'PENDING') resumeStep = 3;
      else if (resumeOrder.status === 'AWAITING_PAYMENT') resumeStep = 5;

      useBuyFlow.setState({
        step: resumeStep,
        orderId: resumeOrder.id,
        adjustedTotal: resumeOrder.adjustedTotal,
        foundGiftcards: giftcards,
        selectedBrand: '',
        selectedCountry: 'US',
        targetAmount: '',
      });
    } else {
      // Fresh flow — clean slate
      useBuyFlow.getState().resetForm();
    }
  }

  return (
    <div className="flex h-full w-full flex-col space-y-1 px-0 py-0 md:space-y-6 md:p-0">
      {/* Header & Progress combined */}
      <div className="border-border bg-card/40 flex flex-row items-center justify-between gap-2.5 rounded-none border-y px-1.5 py-1.5 backdrop-blur-sm md:flex-row md:items-center md:gap-6 md:rounded-xl md:border md:p-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="mb-0 text-lg font-bold md:mb-1 md:text-3xl">Comprar Tarjetas</h1>
          <p className="text-muted-foreground hidden text-xs md:block md:text-base">Encuentra los mejores precios en gift cards.</p>
        </motion.div>

        {/* Compact Progress Steps */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center md:justify-end"
        >
          <div className="flex items-center gap-1 md:gap-2">
            {STEP_LABELS.map((label, idx) => {
              const s = idx + 1;
              return (
                <div key={s} className="flex items-center">
                  <div className="group relative">
                    <motion.div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-all md:h-10 md:w-10 md:text-base ${
                        s === step
                          ? 'border-primary/50 bg-primary shadow-primary/30 text-white shadow-lg'
                          : s < step
                            ? 'border-primary/50 bg-primary/20 text-primary'
                            : 'border-border bg-muted/50 text-muted-foreground/50'
                      } `}
                      animate={{ scale: s === step ? 1.05 : 1 }}
                    >
                      {s < step ? <Check className="h-4 w-4 md:h-5 md:w-5" /> : s}
                    </motion.div>
                    <span
                      className={`absolute -bottom-5 left-1/2 hidden -translate-x-1/2 text-sm font-bold tracking-wider whitespace-nowrap uppercase sm:block md:text-sm ${
                        s === step ? 'text-primary' : 'text-muted-foreground/70'
                      } `}
                    >
                      {label}
                    </span>
                  </div>
                  {idx < STEP_LABELS.length - 1 && (
                    <div className={`h-0.5 w-4 rounded-full transition-all md:w-8 ${s < step ? 'bg-primary/50' : 'bg-muted'} `} />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Steps Content */}
      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex h-full flex-col"
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
};
