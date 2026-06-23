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
  const [sellRate, setSellRate] = useState(sellRateProp ?? 0);
  const [rateError, setRateError] = useState<string | null>(null);
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
    setRateError(null);
    getSellerRate({ brandId, countryId }).then((res) => {
      if (res?.data?.success) {
        setSellRate(res.data.rate);
      } else {
        setSellRate(0);
        setRateError(res?.data?.error || 'No tienes tarifa asignada para vender en esta marca y país. Contactá al administrador.');
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
    <div className="h-full">
      <div className="flex h-full flex-col">
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
                <BrandStep brandCountries={brandCountries} onBrandSelect={handleBrandSelect} rateError={rateError} />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2-load"
                className="h-full"
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
                className="h-full"
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
          </motion.div>
        </AnimatePresence>
      </div>

      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="mx-auto mb-2"
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
