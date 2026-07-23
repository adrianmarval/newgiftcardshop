'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Wallet } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSellFlow } from '@/hooks/use-sell-flow';
import { publishBatch } from '@/actions/seller/batches';
import { getSellerRate } from '@/actions/seller/rates';
import { getPaymentMethod } from '@/actions/seller/payment-method';
import { BrandStep } from '@/components/sell/steps/01-config';
import { DataEntryStep } from '@/components/sell/steps/02-data-entry';
import { ReviewStep } from '@/components/sell/steps/03-review';
import { showAlert } from '@/lib/ui';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import type { BrandCountry } from '@/types';

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
  const [walletConfigured, setWalletConfigured] = useState<boolean | null>(null);
  const [isBinanceWallet, setIsBinanceWallet] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    getPaymentMethod().then((res) => {
      if (res?.data?.success) {
        const hasWallet = res.data.paymentMethod !== null;
        setWalletConfigured(hasWallet);
        setIsBinanceWallet(res.data.paymentMethod?.isBinanceWallet ?? false);
      }
    });
  }, []);

  const selectedBrandCountryData = useMemo(() => {
    if (!selectedBrandCountry) return null;
    return brandCountries.find((bc) => `${bc.brandId}|${bc.countryId}` === selectedBrandCountry) ?? null;
  }, [brandCountries, selectedBrandCountry]);

  const { execute: runPublishBatch, status: publishStatus } = useAction(publishBatch, {
    onSuccess: ({ data }) => {
      if (data?.batchId) {
        if (data.duplicates && data.duplicates.length > 0) {
          setDuplicates(data.duplicates);
          showAlert.toast.info(
            `${data.duplicates.length} duplicate code${data.duplicates.length !== 1 ? 's' : ''} were not added to the batch.`,
          );
        }
        setShowSuccessDialog(true);
      }
    },
    onError: ({ error }) => {
      const valError = error.validationErrors ? (Object.values(error.validationErrors).flat()[0] as string) : null;
      showAlert.toast.error(error.serverError || valError || 'Failed to publish batch');
    },
  });

  const fetchRate = (brandId: string, countryId: string) => {
    setRateError(null);
    getSellerRate({ brandId, countryId }).then((res) => {
      if (res?.data?.success) {
        setSellRate(res.data.rate);
      } else {
        setSellRate(0);
        setRateError(res?.data?.error || 'You don\'t have an assigned rate to sell this brand and country. Contact the administrator.');
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

  if (walletConfigured === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!walletConfigured) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
        <Card className="w-full max-w-md border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <div className="bg-amber-500/20 flex h-16 w-16 items-center justify-center rounded-full">
              <Wallet className="h-8 w-8 text-amber-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold">Wallet Required</h3>
              <p className="text-muted-foreground text-sm">
                You need to configure your USDT wallet before you can publish gift cards. This is where you&apos;ll receive your payments.
              </p>
            </div>
            <Button onClick={() => router.push('/sell/dashboard/account?tab=wallet')} className="bg-amber-600 hover:bg-amber-700 text-white">
              Configure Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full">
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
