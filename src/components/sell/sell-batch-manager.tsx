'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSellFlow } from '@/hooks/use-sell-flow';
import { publishBatch } from '@/actions/seller-actions';
import { BrandStep } from './steps/brand-step';
import { DetailsStep } from './steps/details-step';
import { ReviewStep } from './steps/review-step';
import type { SellBatchManagerProps } from '@/types';
import { toast } from 'sonner';
import { useAction } from 'next-safe-action/hooks';

export function SellBatchManager({ brands, countries, sellRate }: SellBatchManagerProps) {
  const { step, resetForm, giftcards, selectedBrand } = useSellFlow();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const { execute, status } = useAction(publishBatch, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        if (data.duplicates && data.duplicates.length > 0) {
          setDuplicates(data.duplicates);
          toast.info('Some cards were duplicates', {
            description: `Found ${data.duplicates.length} duplicate cards. Duplicates are not added to the batch.
            Duplicate Codes: ${data.duplicates.join(', ')}
            `,
          });
        }
        setShowSuccessDialog(true);
      }
    },
    onError: ({ error }) => {
      toast.error('error publishing batch', {
        description: error.serverError || error.validationErrors?._errors?.[0] || 'Failed to publish batch',
      });
    },
  });

  const handlePublish = async () => {
    execute({
      cards: giftcards.map((g) => ({
        amount: g.amount,
        claimCode: g.claimCode,
        pinCode: g.pinCode || undefined,
      })),
      brandId: selectedBrand,
      countryId: useSellFlow.getState().selectedCountry,
    });
  };

  // Build a brand map for review step to get names without refetching
  const brandMap = Object.fromEntries(brands.map((b) => [b.id, b.name]));
  const countryMap = Object.fromEntries(countries.map((c) => [c.id, c.name]));

  return (
    <div className="w-full space-y-4 px-0 py-2 md:space-y-6 md:px-0 md:py-0">
      {/* Header & Progress combined */}
      <div className="border-border bg-card/40 flex flex-col justify-between gap-4 rounded-none border-y px-3 py-4 backdrop-blur-sm md:flex-row md:items-center md:gap-6 md:rounded-xl md:border md:p-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="mb-0.5 text-3xl font-bold md:mb-1 md:text-4xl">Sell Gift Cards</h1>
          <p className="text-muted-foreground text-sm md:text-base">Create a new batch of gift cards to sell.</p>
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
                  {/* Tooltip-like label - Hidden on XS mobile */}
                  <span
                    className={`absolute -bottom-5 left-1/2 hidden -translate-x-1/2 text-sm font-bold tracking-wider whitespace-nowrap uppercase sm:block md:text-sm ${s === step ? 'text-primary' : 'text-muted-foreground/70'} `}
                  >
                    {s === 1 ? 'Brand' : s === 2 ? 'Details' : 'Review'}
                  </span>
                </div>
                {idx < 2 && <div className={`h-0.5 w-4 rounded-full transition-all md:w-8 ${s < step ? 'bg-primary/50' : 'bg-muted'} `} />}
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
            <BrandStep brands={brands} countries={countries} />
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
            <ReviewStep
              onPublish={handlePublish}
              isPublishing={status === 'executing'}
              brandName={brandMap[selectedBrand] || ''}
              countryName={countryMap[useSellFlow.getState().selectedCountry] || ''}
              sellRate={sellRate}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Dialog */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="mx-auto mb-4"
            >
              <div className="bg-primary/20 mx-auto flex h-20 w-20 items-center justify-center rounded-full">
                <Check className="text-primary h-10 w-10" />
              </div>
            </motion.div>
            <AlertDialogTitle className="text-center text-3xl">Batch Published Successfully!</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-center text-xl">
              Your batch has been submitted for verification.
              <div className="border-border my-4 border-t"></div>
              {duplicates.length > 0 && (
                <div className="mt-4">
                  <div className="font-semibold">Duplicate Codes:</div>
                  <div className="mt-2">
                    {duplicates.map((code) => (
                      <div key={code}>{code}</div>
                    ))}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction
            onClick={() => {
              setShowSuccessDialog(false);
              resetForm();
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 h-11"
          >
            Back to Dashboard
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
