'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BuyFlowCard, useBuyFlow } from '@/hooks/use-buy-flow';
import { SearchStep, RedeemStep, ResultsStep, ConfirmUsageStep, PaymentStep } from '@/components/buy/steps';
import type { BrandCountry, BuyerOrder } from '@/types';
import { GiftcardStatus } from '@/types';

export interface BuyGiftcardManagerProps {
  brandCountries: BrandCountry[];
  resumeOrder?: BuyerOrder | null;
}

export const BuyGiftcardManager = ({ brandCountries, resumeOrder }: BuyGiftcardManagerProps) => {
  const { step } = useBuyFlow();

  const syncedRef = useRef<string | null>(null);
  const targetKey = resumeOrder?.id ?? 'fresh';

  useEffect(() => {
    if (syncedRef.current === targetKey) return;
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
        country: card.country ?? undefined,
      }));

      const firstCard = resumeOrder.giftcards[0];
      const resumeBrandCountryId = firstCard?.brandCountryId ?? resumeOrder.brandCountryId ?? '';

      let resumeStep = 1;
      if (resumeOrder.status === 'PENDING') resumeStep = 3;
      else if (resumeOrder.status === 'AWAITING_PAYMENT') resumeStep = 5;

      useBuyFlow.setState({
        step: resumeStep,
        orderId: resumeOrder.id,
        orderStatus: resumeOrder.status,
        adjustedTotal: resumeOrder.adjustedTotal,
        foundGiftcards: giftcards,
        selectedBrand: resumeBrandCountryId,
        selectedCountry: '',
        targetAmount: '',
      });
    } else {
      useBuyFlow.getState().resetForm();
    }
  }, [targetKey, resumeOrder]);

  return (
    <div className="h-full">
      {/* Steps Content */}
      <div className="flex h-full flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {step === 1 && (
              <motion.div
                key="step-1"
                className="h-full"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SearchStep brandCountries={brandCountries} />
              </motion.div>
            )}
            {step === 2 && (
              <motion.div
                key="step-2"
                className="h-full"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ResultsStep />
              </motion.div>
            )}
            {step === 3 && (
              <motion.div
                key="step-3"
                className="h-full"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <RedeemStep />
              </motion.div>
            )}
            {step === 4 && (
              <motion.div
                key="step-4"
                className="h-full"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ConfirmUsageStep />
              </motion.div>
            )}
            {step === 5 && (
              <motion.div
                key="step-5"
                className="h-full"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <PaymentStep />
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
