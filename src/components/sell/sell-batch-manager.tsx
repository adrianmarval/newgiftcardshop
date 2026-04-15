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
import { BrandStep } from '@/components/sell/steps/brand-step';
import { DetailsStep } from '@/components/sell/steps/details-step';
import { OcrEntryStep } from '@/components/sell/steps/ocr-entry-step';
import { ProofUploadStep } from '@/components/sell/steps/proof-upload-step';
import { ReviewStep } from '@/components/sell/steps/review-step';
import type { SellBatchManagerProps } from './types';
import { toast } from 'sonner';
import { useAction } from 'next-safe-action/hooks';

// ─── Step label helpers ───────────────────────────────────────────────────────

type FlowMode = 'ocr-first' | 'manual-first' | null;

/**
 * Returns the ordered step labels for the current mode.
 *
 * OCR-first:    Brand → Capturas → Review         (steps 1-3)
 * Manual-first: Brand → Códigos → Capturas → Review (steps 1-4)
 * No mode yet:  Brand → Modo → Capturas → Review   (generic, 4 steps)
 */
function getStepLabels(mode: FlowMode): string[] {
  if (mode === 'ocr-first') return ['Brand', 'OCR', 'Review'];
  if (mode === 'manual-first') return ['Brand', 'Codes', 'Match', 'Review'];
  return ['Brand', 'Mode', 'Match', 'Review'];
}

// ─── SellBatchManager ─────────────────────────────────────────────────────────

export const SellBatchManager = ({ brands, countries, sellRate }: SellBatchManagerProps) => {
  const { step, resetForm, giftcards, selectedBrand, entryMode } = useSellFlow();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [duplicates, setDuplicates] = useState<string[]>([]);

  const { execute, status } = useAction(publishBatch, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        if (data.duplicates && data.duplicates.length > 0) {
          setDuplicates(data.duplicates);
          toast.info('Algunas tarjetas eran duplicadas', {
            description: `${data.duplicates.length} código${data.duplicates.length !== 1 ? 's' : ''} duplicado${data.duplicates.length !== 1 ? 's' : ''}. No se agregaron al lote.`,
          });
        }
        setShowSuccessDialog(true);
      }
    },
    onError: ({ error }) => {
      toast.error('Error al publicar el lote', {
        description: error.serverError || error.validationErrors?._errors?.[0] || 'No se pudo publicar el lote',
      });
    },
  });

  const handlePublish = async () => {
    const storeImages = useSellFlow.getState().images;
    execute({
      cards: giftcards.map((g) => {
        // Use evidence.matchedImageId (new) with fallback to legacy matchedImageId
        const matchedImageId = g.evidence?.matchedImageId ?? g.matchedImageId;
        const matchedImage = matchedImageId ? storeImages.find((img) => img.id === matchedImageId) : null;
        return {
          amount: g.amount,
          claimCode: g.claimCode,
          pinCode: g.pinCode || undefined,
          compressedImageData: matchedImage?.compressedData,
        };
      }),
      brandId: selectedBrand,
      countryId: useSellFlow.getState().selectedCountry,
    });
  };

  // ── Step labels & progress ──────────────────────────────────────────────

  const stepLabels = getStepLabels(entryMode);
  const totalSteps = stepLabels.length;

  // Build a brand map for review step
  const brandMap = Object.fromEntries(brands.map((b) => [b.id, b.name]));
  const countryMap = Object.fromEntries(countries.map((c) => [c.id, c.name]));

  // ── Step component resolver ─────────────────────────────────────────────
  //
  // OCR-first path:    step 1 = Brand, step 2 = OcrEntryStep, step 3 = Review
  // Manual-first path: step 1 = Brand, step 2 = DetailsStep, step 3 = ProofUpload, step 4 = Review
  // No mode:           step 1 = Brand, step 2 = DetailsStep (shows mode selector inside)

  function getBackStep(): number {
    if (entryMode === 'ocr-first') return Math.max(1, step - 1);
    if (entryMode === 'manual-first') return Math.max(1, step - 1);
    return Math.max(1, step - 1);
  }

  const reviewStep = entryMode === 'ocr-first' ? 3 : 4;

  return (
    <div className="w-full space-y-4 px-0 py-2 md:space-y-6 md:px-0 md:py-0">
      {/* Header & Progress combined */}
      <div className="border-border bg-card/40 flex flex-col justify-between gap-4 rounded-none border-y px-3 py-4 backdrop-blur-sm md:flex-row md:items-center md:gap-6 md:rounded-xl md:border md:p-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="mb-0.5 text-3xl font-bold md:mb-1 md:text-4xl">Vender Gift Cards</h1>
          <p className="text-muted-foreground text-sm md:text-base">Creá un nuevo lote de tarjetas para vender.</p>
        </motion.div>

        {/* Compact Progress Steps */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center md:justify-end"
        >
          <div className="flex items-center gap-1 md:gap-2">
            {stepLabels.map((label, idx) => {
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

        {step === 2 && entryMode === 'ocr-first' && (
          <motion.div
            key="step-2-ocr"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <OcrEntryStep />
          </motion.div>
        )}

        {step === 2 && entryMode !== 'ocr-first' && (
          <motion.div
            key="step-2-manual"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <DetailsStep />
          </motion.div>
        )}

        {step === 3 && entryMode === 'manual-first' && (
          <motion.div
            key="step-3-proof"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ProofUploadStep sellRate={sellRate} />
          </motion.div>
        )}

        {step === reviewStep && (
          <motion.div
            key={`step-review-${reviewStep}`}
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
              backStep={getBackStep()}
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
            <AlertDialogTitle className="text-center text-3xl">¡Lote publicado con éxito!</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-center text-xl">
              Tu lote fue enviado para verificación.
              <div className="border-border my-4 border-t"></div>
              {duplicates.length > 0 && (
                <div className="mt-4">
                  <div className="font-semibold">Códigos duplicados:</div>
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
            Volver al Dashboard
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
