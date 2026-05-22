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
import { publishBatch } from '@/actions/seller/batches';
import { getSellerRate } from '@/actions/seller/rates';
import { BrandStep } from '@/components/sell/steps/brand-step';
import { DataEntryStep } from '@/components/sell/steps/data-entry-step';
import { ReviewStep } from '@/components/sell/steps/review-step';
import { showAlert } from '@/lib/swal';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { BrandCountry } from '@/types';

export const STEP_LABELS = ['Config', 'Load', 'Review'];

export interface SellBatchManagerProps {
  brandCountries: BrandCountry[];
  sellRate?: number;
}

export const SellBatchManager = ({ brandCountries, sellRate: sellRateProp }: SellBatchManagerProps) => {
  const { step, resetForm, giftcards, selectedBrandCountry } = useSellFlow();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [sellRate, setSellRate] = useState(sellRateProp ?? 0.75);
  const router = useRouter();

  const selectedBrandCountryData = useMemo(() => {
    if (!selectedBrandCountry) return null;
    return brandCountries.find((bc) => `${bc.brandId}|${bc.countryId}` === selectedBrandCountry) ?? null;
  }, [brandCountries, selectedBrandCountry]);

  const { execute: runPublishBatch, status: publishStatus } = useAction(publishBatch, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        if (data.duplicates && data.duplicates.length > 0) {
          setDuplicates(data.duplicates);
          showAlert.toast.info(
            `${data.duplicates.length} código${data.duplicates.length !== 1 ? 's' : ''} duplicado${data.duplicates.length !== 1 ? 's' : ''}. No fueron agregados al batch.`,
          );
        }
        setShowSuccessDialog(true);
      }
    },
    onError: ({ error }) => {
      const valError = error.validationErrors ? (Object.values(error.validationErrors).flat()[0] as string) : null;
      showAlert.toast.error(error.serverError || valError || 'No se pudo publicar el batch');
    },
  });

  const fetchRate = (brandId: string, countryId: string) => {
    getSellerRate({ brandId, countryId }).then((res) => {
      if (res?.data?.success) {
        setSellRate(res.data.rate);
      } else {
        showAlert.toast.warning(res?.data?.error || 'No hay tarifas configuradas.');
        setSellRate(0.75);
      }
    });
  };

  const handleBrandSelect = (brandId: string, countryId: string) => {
    fetchRate(brandId, countryId);
  };

  const handlePublish = () => {
    if (!selectedBrandCountryData) return;
    const storeImages = useSellFlow.getState().images;
    const unmatchedImagesIds = useSellFlow.getState().unmatchedImages.map((u) => u.imageId);

    runPublishBatch({
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
      unmatchedImages: unmatchedImagesIds
        .map((id) => storeImages.find((img) => img.id === id)?.compressedData)
        .filter(Boolean)
        .map((data) => ({ data: data as string })),
    });
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    resetForm();
    router.push('/sell/dashboard/cards');
  };

  return (
    <div className="flex w-full flex-col space-y-4">
      <div className="bg-card/40 flex flex-row items-center justify-between gap-2.5 rounded-none backdrop-blur-sm md:flex-row md:items-center md:gap-6 md:rounded-xl md:border md:p-6">
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
                  {idx < STEP_LABELS.length - 1 && (
                    <div className={`h-0.5 w-4 rounded-full transition-all md:w-8 ${s < step ? 'bg-primary/50' : 'bg-muted'} `} />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto">
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
              <BrandStep brandCountries={brandCountries} onBrandSelect={handleBrandSelect} />
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
                  isPublishing={publishStatus === 'executing'}
                  brandCountry={selectedBrandCountryData}
                  sellRate={sellRate}
                  backStep={2}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
            onClick={handleSuccessDialogClose}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 h-11"
          >
            Go to Cards History
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
