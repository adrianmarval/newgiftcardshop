'use client';

import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { BuyFlowCard, useBuyFlow } from '@/hooks/use-buy-flow';
import { SearchStep, RedeemStep, ResultsStep, ConfirmUsageStep } from '@/components/buy/buy-steps';
import { PaymentStep } from '@/components/buy/buy-steps/payment-step';
import { BrandCountry, BuyerOrder, GiftcardStatus } from '@/types';

export const STEP_LABELS = ['Buscar', 'Seleccionar', 'Redimir', 'Uso', 'Pagar'];

export interface BuyGiftcardManagerProps {
  brandCountries: BrandCountry[];
  resumeOrder?: BuyerOrder | null;
}

export const BuyGiftcardManager = ({ brandCountries, resumeOrder }: BuyGiftcardManagerProps) => {
  const { step } = useBuyFlow();

  // Sync store ONCE per mount / per orderId change — synchronously before first paint
  const syncedRef = useRef<string | null>(null);
  const targetKey = resumeOrder?.id ?? 'fresh';

  if (syncedRef.current !== targetKey) {
    syncedRef.current = targetKey;

    if (resumeOrder) {
      const giftcards: BuyFlowCard[] = resumeOrder.giftcards.map((card) => ({
        id: card.id,
        brand: card.brand.name,
        amount: card.amount,
        claimCode: card.claimCode,
        pinCode: card.pinCode || undefined,
        status: card.status as GiftcardStatus,
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
        selectedCountry: '',
        targetAmount: '',
      });
    } else {
      // Fresh flow — clean slate
      useBuyFlow.getState().resetForm();
    }
  }

  return (
    <div className="flex w-full flex-col space-y-4">
      <div className="bg-card/40 flex flex-row items-center justify-between gap-2.5 rounded-none backdrop-blur-sm md:flex-row md:items-center md:gap-6 md:rounded-xl md:border md:p-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="mb-0 text-lg font-bold md:mb-1 md:text-3xl">Pasos de Compra</h1>
          <p className="text-muted-foreground hidden text-xs md:block md:text-base">Completa los pasos para comprar giftcards.</p>
        </motion.div>
        {/* Compact Progress Steps */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-center md:justify-end"
        >
          <div className="flex items-center md:gap-2">
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
                      className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-bold tracking-wider whitespace-nowrap uppercase sm:block md:text-sm ${
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
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex h-full min-h-[300px] flex-col overflow-hidden"
          >
            {step === 1 && <SearchStep brandCountries={brandCountries} />}
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
