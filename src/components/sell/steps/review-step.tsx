'use client';

import React, { useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, X, Camera, ImageOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useSellFlow } from '@/hooks/use-sell-flow';
import { isBlockingEvidenceState, type ValidationState, SellFlowImage } from '@/hooks/use-sell-flow';

import { cn } from '@/lib/utils';
import { useAction } from 'next-safe-action/hooks';
import { uploadImage } from '@/actions/buyer/giftcards/ocr/upload-image';
import { extractDraft } from '@/actions/buyer/giftcards/ocr/extract-draft';
import { showAlert } from '@/lib/swal';
import { normalizeClaimCode } from '@/lib/utils/claim-code-parser';
import { validationStatusConfig } from '@/lib/ui-config';
import { BrandCountry } from '@/types';
import { MAX_BATCH_SIZE } from '@/lib/constants';
import Image from 'next/image';
import { SellStepsProgress } from './sell-steps-progress';

export interface ReviewStepProps {
  onPublish: () => void;
  isPublishing?: boolean;
  brandCountry: BrandCountry;
  sellRate: number;
  backStep?: number;
}

export function ReviewStep({ onPublish, isPublishing, brandCountry, sellRate, backStep }: ReviewStepProps) {
  const { giftcards, images, setStep, resolveAmountMismatch, addImageToCard } = useSellFlow();

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [processingCardId, setProcessingCardId] = useState<string | null>(null);

  const imageMap = useMemo(() => {
    const map = new Map<string, SellFlowImage>();
    for (const img of images) map.set(img.id, img);
    return map;
  }, [images]);

  const extractionContext = useRef<{ imageId: string; compressedData: string; previewUrl: string } | null>(null);

  const { execute: runExtraction } = useAction(extractDraft, {
    onSuccess: ({ data }) => {
      if (!processingCardId) return;

      if (data?.success && data.cards.length > 0) {
        const extracted = data.cards[0];
        const card = giftcards.find((c) => c.id === processingCardId);
        if (!card) return;

        const normalizedCard = normalizeClaimCode(card.claimCode);
        const normalizedExtracted = extracted.claimCode ? normalizeClaimCode(extracted.claimCode) : null;

        if (normalizedCard && normalizedExtracted && normalizedCard !== normalizedExtracted) {
          showAlert.toast.error('Code mismatch: The screenshot code does not match this gift card.');
          setProcessingCardId(null);
          return;
        }

        const imgId = extractionContext.current?.imageId;
        const compressedData = extractionContext.current?.compressedData;
        const previewUrl = extractionContext.current?.previewUrl;

        if (imgId && compressedData && previewUrl) {
          addImageToCard(
            processingCardId,
            { imageId: imgId, compressedData, previewUrl },
            extracted.rawExtractedCode ?? extracted.claimCode ?? null,
            extracted.rawExtractedAmount ?? extracted.amount ?? null,
          );
          showAlert.toast.success('Evidence linked');
        }
      } else {
        showAlert.toast.error('Could not read code: Try a clearer screenshot.');
      }
      setProcessingCardId(null);
    },
    onError: () => {
      showAlert.toast.error('Extraction failed: Error reading image');
      setProcessingCardId(null);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, cardId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingCardId(cardId);

    const uploadRes = await uploadImage({ file });
    if (uploadRes.data?.success && uploadRes.data.compressedData) {
      const imageId = `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const previewUrl = URL.createObjectURL(file);

      extractionContext.current = { imageId, compressedData: uploadRes.data.compressedData, previewUrl };

      runExtraction({ images: [{ id: imageId, compressedData: uploadRes.data.compressedData }] });
    } else {
      showAlert.toast.error('Upload failed: Error uploading image');
      setProcessingCardId(null);
    }

    e.target.value = '';
  };

  const totalAmount = giftcards.reduce((sum, card) => sum + (parseFloat(card.amount) || 0), 0);
  const totalToReceive = totalAmount * sellRate;
  const currencySymbol = brandCountry?.countryCurrency === 'GBP' ? '£' : brandCountry?.countryCurrency === 'CAD' ? 'C$' : '$';

  const sortedGiftcards = useMemo(() => {
    return [...giftcards].sort((a, b) => {
      const aStatus = a.evidence?.status ?? 'no_capture';
      const bStatus = b.evidence?.status ?? 'no_capture';
      const aPriority = aStatus === 'amount_required' || aStatus === 'amount_mismatch' ? 0 : aStatus === 'no_capture' ? 1 : 2;
      const bPriority = bStatus === 'amount_required' || bStatus === 'amount_mismatch' ? 0 : bStatus === 'no_capture' ? 1 : 2;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return 0;
    });
  }, [giftcards]);

  const withCaptureCount = giftcards.filter((card) => {
    const mid = card.evidence?.matchedImageId;
    const status = card.evidence?.status;
    return !!mid && status !== 'skipped' && status !== 'no_capture';
  }).length;

  const noEvidenceCount = giftcards.length - withCaptureCount;
  const handleBack = () => setStep(backStep ?? 2);

  return (
    // Ajustado h-screen/h-full dinámico para asegurar que flex-1 y min-h-0 confinen la UI perfectamente en mobile
    <div className="flex h-full min-h-0 w-full max-w-full flex-col gap-1">
      {/* Barra de progreso superior */}
      <div className="shrink-0">
        <SellStepsProgress />
      </div>

      {/* Contenedor Split Principal */}
      <div className="flex min-h-0 w-full max-w-full flex-1 flex-col gap-1 md:flex-row">
        {/* Columna Izquierda: Panel de Resumen (Compactado en móvil para ocupar el mínimo espacio arriba) */}
        <Card className="flex w-full shrink-0 flex-col gap-0 border p-1 backdrop-blur-sm md:w-80 md:flex-col md:gap-0 md:space-y-1 md:p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold md:text-lg">Review</h2>
          </div>

          {/* Opción B: 2 columnas arriba, full-width abajo */}
          <div className="flex flex-col gap-1">
            {/* Fila 1: Cards | Total */}
            <div className="grid grid-cols-2 gap-1">
              <div className="flex flex-col justify-center rounded-lg border border-slate-500/20 bg-slate-800/30 p-1.5">
                <span className="text-[9px] font-medium tracking-wider text-slate-400 uppercase">Cards</span>
                <p className="text-base font-black text-white">{giftcards.length}</p>
              </div>

              <div className="flex flex-col justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-1.5">
                <span className="text-[9px] font-medium tracking-wider text-emerald-400 uppercase">Total</span>
                <p className="text-base font-black text-emerald-400">
                  {currencySymbol}
                  {totalAmount.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Fila 2: Missing Screens y You Receive apilados al 100% */}
            {noEvidenceCount > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-2 py-1">
                <span className="text-[9px] font-medium tracking-wider text-amber-300 uppercase">Missing Screens</span>
                <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-black text-amber-300">{noEvidenceCount}</span>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1">
              <div className="flex flex-col">
                <span className="text-[9px] font-medium tracking-wider text-emerald-400 uppercase">You receive</span>
                <p className="text-base font-black text-emerald-400">${totalToReceive.toFixed(2)}</p>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/5 text-[9px] font-bold text-emerald-400">
                {sellRate * 100}%
              </Badge>
            </div>
          </div>
        </Card>

        {/* Columna Derecha: Listado de Tarjetas (Toma todo el alto disponible en mobile y escupe scroll) */}
        <Card className="flex min-h-0 w-full max-w-full flex-1 flex-col gap-0 border py-1 backdrop-blur-sm">
          <CardHeader className="flex shrink-0 flex-row items-center justify-between md:px-4 md:py-3">
            <Label className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase md:text-xs">Cards Queue</Label>
            <Badge variant="outline" className="border-border text-muted-foreground text-[10px] font-medium">
              {giftcards.length} Total
            </Badge>
          </CardHeader>

          <CardContent className="custom-scrollbar min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto p-1 md:p-4">
            <div className="grid w-full max-w-full grid-cols-1 gap-1 sm:grid-cols-2">
              {sortedGiftcards.map((card, idx) => {
                const matchedImageId = card.evidence?.matchedImageId;
                const evidenceStatus = card.evidence?.status;
                const hasCapture = !!matchedImageId;

                const config = validationStatusConfig[evidenceStatus as ValidationState] || validationStatusConfig.no_capture;
                const Icon = config.icon;
                const isBlocking = isBlockingEvidenceState(evidenceStatus as ValidationState);

                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                    className={cn(
                      'group border-border bg-muted/20 relative w-full max-w-full rounded-xl border p-2 transition-all md:p-3',
                      isBlocking ? 'border-primary/40 bg-primary/5 ring-primary/20 shadow-sm ring-1' : 'hover:border-primary/30',
                    )}
                  >
                    <div className="flex w-full flex-col gap-1.5 md:gap-1">
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="bg-primary/20 text-primary flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black md:h-5 md:w-5 md:text-[10px]">
                            {idx + 1}
                          </div>
                          <span className="text-foreground text-sm font-black md:text-lg">
                            {currencySymbol}
                            {card.amount || '0.00'}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {hasCapture ? (
                            <Badge className={cn('border-0 px-1.5 py-0.5 text-[9px] font-medium shadow-none md:text-[10px]', config.color)}>
                              <Icon className="mr-0.5 h-3 w-3 shrink-0 md:mr-1" />
                              <span className="inline-block max-w-[75px] truncate md:max-w-[90px]">
                                {evidenceStatus === 'no_capture' ? 'Manual review' : config.label}
                              </span>
                            </Badge>
                          ) : (
                            <Badge className="border-slate-500/30 bg-slate-500/20 px-1.5 py-0.5 text-[9px] font-medium text-slate-400 shadow-none md:text-[10px]">
                              <ImageOff className="mr-1 h-3 w-3 shrink-0" />
                              No capture
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex w-full flex-col gap-1 md:gap-1.5">
                        <div className="flex w-full items-center justify-between gap-1 text-[11px] md:text-sm">
                          <span className="text-muted-foreground shrink-0 text-[9px] font-semibold tracking-tighter uppercase md:text-[10px]">
                            Code
                          </span>
                          <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                            <div className="flex shrink-0 items-center">
                              {hasCapture ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage(matchedImageId!)}
                                  className="border-border hover:border-primary/50 group/thumb bg-background h-5 w-5 overflow-hidden rounded border transition-colors md:h-7 md:w-7"
                                >
                                  <img
                                    src={imageMap.get(matchedImageId!)?.previewUrl || '#'}
                                    alt=""
                                    className="h-full w-full object-cover transition-transform group-hover/thumb:scale-110"
                                  />
                                </button>
                              ) : (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  disabled={processingCardId === card.id}
                                  onClick={() => document.getElementById(`file-input-${card.id}`)?.click()}
                                  className="border-border hover:bg-primary/5 hover:text-primary h-5 w-5 rounded border bg-transparent md:h-7 md:w-7"
                                >
                                  {processingCardId === card.id ? (
                                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                  ) : (
                                    <Camera className="h-2.5 w-2.5" />
                                  )}
                                </Button>
                              )}
                              <input
                                id={`file-input-${card.id}`}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileSelect(e, card.id)}
                              />
                            </div>
                            <span className="text-foreground truncate font-mono text-[11px] font-bold select-all md:text-sm">
                              {card.claimCode}
                            </span>
                          </div>
                        </div>

                        {card.pinCode && (
                          <div className="flex w-full items-center justify-between text-[11px] md:text-sm">
                            <span className="text-muted-foreground text-[9px] font-semibold tracking-tighter uppercase md:text-[10px]">
                              PIN
                            </span>
                            <span className="text-muted-foreground font-mono text-[11px] font-medium select-all md:text-xs">
                              {card.pinCode}
                            </span>
                          </div>
                        )}
                      </div>

                      {evidenceStatus === 'amount_mismatch' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="border-border mt-1 w-full space-y-1.5 overflow-hidden rounded-lg border bg-amber-500/10 p-1.5 md:space-y-1 md:p-2"
                        >
                          <p className="text-[9px] font-bold text-amber-300 md:text-xs">Amount Mismatch</p>
                          <div className="grid grid-cols-2 gap-1">
                            <div className="rounded border border-amber-500/10 bg-black/20 p-1 md:p-1.5">
                              <p className="text-[8px] font-medium text-amber-200/50 uppercase">Written</p>
                              <p className="text-[11px] font-black md:text-xs">
                                {currencySymbol}
                                {card.amount}
                              </p>
                            </div>
                            <div className="rounded border border-emerald-500/10 bg-black/20 p-1 md:p-1.5">
                              <p className="text-[8px] font-medium text-emerald-200/50 uppercase">In Picture</p>
                              <p className="text-[11px] font-black text-emerald-400 md:text-xs">
                                {currencySymbol}
                                {card.evidence?.extractedAmount || '?'}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resolveAmountMismatch(card.id, 'keep-declared')}
                              className="h-6 flex-1 border-amber-500/20 bg-amber-500/5 px-1 text-[8px] font-bold text-amber-200 transition-colors hover:bg-amber-500/10 md:h-7 md:px-2 md:text-[9px]"
                            >
                              Keep Written
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => resolveAmountMismatch(card.id, 'accept-extracted')}
                              className="h-6 flex-1 bg-emerald-500/20 px-1 text-[8px] font-bold text-emerald-400 transition-colors hover:bg-emerald-500/30 md:h-7 md:px-2 md:text-[9px]"
                            >
                              Use Photo
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <div
                      className={cn(
                        'pointer-events-none absolute top-0 right-0 -mt-8 -mr-8 h-12 w-12 rounded-full transition-transform duration-500 group-hover:scale-150',
                        isBlocking ? 'bg-primary/10' : 'bg-primary/5',
                      )}
                    />
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Botones de Acción (Fija abajo en ambos layouts) */}
      <div className="flex shrink-0 items-center justify-between gap-1">
        <Button onClick={handleBack} variant="outline" size="sm" className="h-9 flex-1 text-xs font-bold md:h-10">
          Back
        </Button>
        <Button
          onClick={onPublish}
          disabled={isPublishing || giftcards.length > MAX_BATCH_SIZE || giftcards.some((c) => isBlockingEvidenceState(c.evidence?.status))}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 flex-1 text-xs font-bold md:h-10"
        >
          {isPublishing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : 'Publish Batch'}
        </Button>
      </div>

      {/* Modal Preview Imagen */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-lg overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-xl">
          <DialogTitle className="sr-only">Screenshot Preview</DialogTitle>
          <DialogDescription className="sr-only">Preview of the uploaded gift card screenshot</DialogDescription>
          {previewImage && imageMap.has(previewImage) && (
            <div className="relative w-full max-w-full overflow-hidden">
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="bg-background/80 hover:bg-background border-border absolute top-2 right-2 z-10 rounded-full border p-1.5 backdrop-blur-sm transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="relative max-h-[80vh] min-h-[300px] w-full">
                <Image
                  src={imageMap.get(previewImage)!.previewUrl}
                  fill
                  alt="Gift card screenshot"
                  className="rounded-xl object-contain shadow-2xl"
                  sizes="(max-w-768px) 100vw, 600px"
                  priority
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
