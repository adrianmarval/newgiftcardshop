'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSellFlow } from '@/hooks/use-sell-flow';
import { publishBatch } from '@/actions/seller/publish-batch';
import { BrandStep } from '@/components/sell/steps/brand-step';
import { DataEntryStep } from '@/components/sell/steps/data-entry-step';
import { ReviewStep } from '@/components/sell/steps/review-step';
import type { SellBatchManagerProps } from './types';
import { toast } from 'sonner';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';

const STEP_LABELS = ['Config', 'Load', 'Review'];

export const SellBatchManager = ({ brandCountries, sellRate }: SellBatchManagerProps) => {
  const { step, resetForm, giftcards, selectedBrandCountry, images, brandCountryLimits } = useSellFlow();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const router = useRouter();

  const selectedBrandCountryData = useMemo(() => {
    return brandCountries.find((bc) => `${bc.brandId}|${bc.countryId}` === selectedBrandCountry);
  }, [brandCountries, selectedBrandCountry]);

  const { execute, status } = useAction(publishBatch, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        if (data.duplicates && data.duplicates.length > 0) {
          setDuplicates(data.duplicates);
          toast.info('Some cards were duplicates', {
            description: `${data.duplicates.length} duplicate code${data.duplicates.length !== 1 ? 's' : ''}. They were not added to the batch.`,
          });
        }
        setShowSuccessDialog(true);
      }
    },
    onError: ({ error }) => {
      toast.error('Error publishing batch', {
        description: error.serverError || error.validationErrors?._errors?.[0] || 'Could not publish batch',
      });
    },
  });

  const handlePublish = async () => {
    if (!selectedBrandCountryData) return;
    const storeImages = useSellFlow.getState().images;
    execute({
      cards: giftcards.map((g) => {
        const matchedImageId = g.evidence?.matchedImageId;
        const matchedImage = matchedImageId ? storeImages.find((img) => img.id === matchedImageId) : null;
        return {
          amount: g.amount,
          claimCode: g.claimCode,
          pinCode: g.pinCode || undefined,
          compressedImageData: matchedImage?.compressedData,
        };
      }),
      brandId: selectedBrandCountryData.brandId,
      countryId: selectedBrandCountryData.countryId,
    });
  };

  const totalSteps = STEP_LABELS.length;

  return (
    <div className="flex h-full w-full flex-col space-y-1 px-0 py-0 md:space-y-6 md:px-0 md:py-0">
      <div className="border-border bg-card/40 flex flex-row items-center justify-between gap-2.5 rounded-none border-y px-1.5 py-1.5 backdrop-blur-sm md:flex-row md:items-center md:gap-6 md:rounded-xl md:border md:p-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="mb-0 text-lg font-bold md:mb-1 md:text-3xl">Sell Gift Cards</h1>
          <p className="text-muted-foreground hidden text-xs md:block md:text-base">Complete the batch in this session.</p>
        </motion.div>

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
                  {idx < totalSteps - 1 && (
                    <div className={`h-0.5 w-4 rounded-full transition-all md:w-8 ${s < step ? 'bg-primary/50' : 'bg-muted'} `} />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step-1"
            className="flex-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <BrandStep brandCountries={brandCountries} />
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-2-load"
            className="h-full min-h-0 flex-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <DataEntryStep />
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step-review"
            className="flex-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {selectedBrandCountryData && (
              <ReviewStep
                onPublish={handlePublish}
                isPublishing={status === 'executing'}
                brandCountry={selectedBrandCountryData}
                sellRate={sellRate}
                backStep={2}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
            <AlertDialogTitle className="text-center text-3xl">Batch published successfully!</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-center text-xl">
                <span className="text-muted-foreground">Your batch was sent for verification.</span>
                <div className="border-border my-4 border-t"></div>
                {duplicates.length > 0 && (
                  <div className="mt-4 text-left">
                    <div className="font-semibold">Duplicate codes:</div>
                    <div className="mt-2">
                      {duplicates.map((code) => (
                        <div key={code}>{code}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction
            onClick={() => {
              setShowSuccessDialog(false);
              resetForm();
              router.push('/sell/dashboard/cards');
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 h-11"
          >
            Go to Cards History
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This batch is not automatically saved. If you leave now, you will lose all loaded cards and screenshots.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDiscardDialog(false);
                resetForm();
              }}
            >
              Leave and discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
