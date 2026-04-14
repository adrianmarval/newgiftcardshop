'use client';

import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { useBuyFlow } from '@/hooks/use-buy-flow';
import { SearchStep } from './steps/search-step';
import { ResultsStep } from './steps/results-step';
import { RedeemStep } from './steps/redeem-step';
import { ConfirmUsageStep } from './steps/confirm-usage-step';
import { PaymentStep } from './steps/payment-step';
import type { BuyGiftcardManagerProps, BuyGiftcardItem, BuyGiftcardStatus } from '@/types';

export function BuyGiftcardManager({ brands, countries, resumeOrder }: BuyGiftcardManagerProps) {
  const { step } = useBuyFlow();

  // Sync store ONCE per mount / per orderId change — synchronously before first paint
  const syncedRef = useRef<string | null>(null);
  const targetKey = resumeOrder?.id ?? 'fresh';

  if (syncedRef.current !== targetKey) {
    syncedRef.current = targetKey;

    if (resumeOrder) {
      const giftcards: BuyGiftcardItem[] = resumeOrder.giftcards.map((card) => ({
        id: card.id,
        brand: card.brand.name,
        amount: card.amount,
        claimCode: card.claimCode,
        pinCode: card.pinCode || undefined,
        status: card.status as BuyGiftcardStatus,
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
    <div className="w-full space-y-4 px-0 py-2 md:space-y-6 md:px-0 md:py-0">
      {/* Header & Progress combined */}
      <div className="border-border bg-card/40 flex flex-col justify-between gap-4 rounded-none border-y px-3 py-4 backdrop-blur-sm md:flex-row md:items-center md:gap-6 md:rounded-xl md:border md:p-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col">
          <h1 className="mb-0.5 text-3xl font-bold md:mb-1 md:text-4xl">Comprar Tarjetas de Regalo</h1>
          <p className="text-muted-foreground text-sm md:text-base">Encuentra y compra tarjetas de regalo a las mejores tasas.</p>
        </motion.div>

        {/* Multi-step Progress */}
        <div className="no-scrollbar flex items-center gap-2 pb-2 md:gap-4 md:pb-0">
          {[1, 2, 3, 4, 5].map((s) => (
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
                  className={`absolute -bottom-5 left-1/2 hidden -translate-x-1/2 text-xs font-bold tracking-wider whitespace-nowrap uppercase sm:block md:text-sm ${s === step ? 'text-primary' : 'text-muted-foreground/70'} `}
                >
                  {s === 1 ? 'Buscar' : s === 2 ? 'Seleccionar' : s === 3 ? 'Redimir' : s === 4 ? 'Uso' : 'Pagar'}
                </span>
              </div>
              {s < 5 && (
                <div className={`mx-1 h-0.5 w-4 rounded-full transition-all md:mx-2 md:w-8 ${s < step ? 'bg-primary/50' : 'bg-muted'} `} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Steps Content */}
      <div className="relative min-h-125 md:min-h-150">
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
