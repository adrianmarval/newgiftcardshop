'use client';

import React, { useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, HelpCircle, ImageIcon, ImageOff, Loader2, MinusCircle, Trash2, X, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useSellFlow } from '@/hooks/use-sell-flow';
import { isBlockingEvidenceState, type ValidationState } from '@/types/application/sell-flow';
import type { SellFlowImage } from '@/types/application/sell-flow';
import type { ReviewStepProps } from '@/components/sell/types';
import { cn } from '@/lib/utils';
import { useAction } from 'next-safe-action/hooks';
import { uploadProvenanceImage, extractDraftBatch } from '@/actions/giftcard/ocr';
import { toast } from 'sonner';
import { normalizeClaimCode, formatClaimCodeCanonical } from '@/lib/utils/claim-code-parser';

// ─── Status config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ValidationState, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  verified: { label: 'Verified', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  amount_mismatch: { label: 'Review amount', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: AlertCircle },
  amount_required: { label: 'Amount required', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertCircle },
  code_new_detected: { label: 'New code', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: HelpCircle },
  no_capture: { label: 'No capture', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: ImageIcon },
  capture_mismatch: { label: 'Incorrect capture', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: AlertCircle },
  processing_error: { label: 'Error', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: AlertCircle },
  fuzzy_match: { label: 'Review code', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: HelpCircle },
  skipped: { label: 'No capture', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: MinusCircle },
  amount_not_found: { label: 'Missing amount', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: AlertCircle },
  error: { label: 'Error', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: AlertCircle },
};

const STATUS_INDICATOR_COLORS: Record<ValidationState, string> = {
  verified: 'bg-emerald-500',
  amount_mismatch: 'bg-amber-500',
  amount_required: 'bg-red-500',
  code_new_detected: 'bg-blue-500',
  no_capture: 'bg-slate-500',
  capture_mismatch: 'bg-orange-500',
  processing_error: 'bg-red-500',
  fuzzy_match: 'bg-purple-500',
  skipped: 'bg-slate-500',
  amount_not_found: 'bg-blue-500',
  error: 'bg-red-500',
};

export function ReviewStep({ onPublish, isPublishing, brandCountry, sellRate, backStep }: ReviewStepProps) {
  const {
    giftcards,
    images,
    setStep,
    removeGiftcard,
    updateGiftcard,
    confirmFuzzyMatch,
    rejectFuzzyMatch,
    resolveAmountMismatch,
    addImageToCard,
  } = useSellFlow();

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [processingCardId, setProcessingCardId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Image lookup map ──────────────────────────────────────────────────────
  const imageMap = useMemo(() => {
    const map = new Map<string, SellFlowImage>();
    for (const img of images) map.set(img.id, img);
    return map;
  }, [images]);

  // ── Extraction Handler ──────────────────────────────────────────────────

  const { execute: runExtraction } = useAction(extractDraftBatch, {
    onSuccess: ({ data }) => {
      if (!processingCardId) return;

      if (data?.success && data.cards.length > 0) {
        const extracted = data.cards[0];
        const card = giftcards.find((c) => c.id === processingCardId);
        if (!card) return;

        const normalizedCard = normalizeClaimCode(card.claimCode);
        const normalizedExtracted = extracted.claimCode ? normalizeClaimCode(extracted.claimCode) : null;

        // Validation rule: Reject if codes don't match even fuzzy (distance > 1)
        // Fuzzy distance logic is handled inside addImageToCard's status calculation,
        // but here we enforce the "do not add if mismatch" rule by checking status.
        // We'll temporarily simulate the status check or just verify distance here.

        let isMatch = false;
        if (normalizedCard && normalizedExtracted) {
          if (normalizedCard === normalizedExtracted) {
            isMatch = true;
          } else {
            let distance = 0;
            for (let i = 0; i < normalizedCard.length && i < normalizedExtracted.length; i++) {
              if (normalizedCard[i] !== normalizedExtracted[i]) distance++;
              if (distance > 1) break;
            }
            if (distance <= 1 && normalizedCard.length === normalizedExtracted.length) {
              isMatch = true;
            }
          }
        }

        if (!isMatch) {
          toast.error('Code mismatch', {
            description: 'The screenshot code does not match this gift card.',
          });
        } else {
          // It's a match (exact or fuzzy) -> Add to store
          // Amount mismatch will be handled by the resolution boxes
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
            toast.success('Evidence linked');
          }
        }
      } else {
        toast.error('Could not read code', { description: 'Try a clearer screenshot.' });
      }
      setProcessingCardId(null);
    },
    onError: () => {
      toast.error('Extraction failed');
      setProcessingCardId(null);
    },
  });

  const extractionContext = useRef<{ imageId: string; compressedData: string; previewUrl: string } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, cardId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingCardId(cardId);

    const uploadRes = await uploadProvenanceImage({ file });
    if (uploadRes.data?.success && uploadRes.data.compressedData) {
      const imageId = `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const previewUrl = URL.createObjectURL(file);

      extractionContext.current = {
        imageId,
        compressedData: uploadRes.data.compressedData,
        previewUrl,
      };

      runExtraction({
        images: [{ id: imageId, compressedData: uploadRes.data.compressedData }],
      });
    } else {
      toast.error('Upload failed');
      setProcessingCardId(null);
    }

    e.target.value = '';
  };

  const totalAmount = giftcards.reduce((sum, card) => sum + (parseFloat(card.amount) || 0), 0);
  const totalToReceive = totalAmount * sellRate;

  // ── Sorting Logic: User attention first ───────────────────────────────
  // 1. amount_required / amount_mismatch (user must resolve)
  // 2. no_capture (no image linked - user can add)
  // 3. verified (all good)
  const sortedGiftcards = useMemo(() => {
    return [...giftcards].sort((a, b) => {
      const aStatus = a.evidence?.status ?? 'no_capture';
      const bStatus = b.evidence?.status ?? 'no_capture';

      const aPriority = aStatus === 'amount_required' || aStatus === 'amount_mismatch' ? 0 : aStatus === 'no_capture' ? 1 : 2;
      const bPriority = bStatus === 'amount_required' || bStatus === 'amount_mismatch' ? 0 : bStatus === 'no_capture' ? 1 : 2;

      if (aPriority !== bPriority) return aPriority - bPriority;

      // Same priority - maintain original index order
      return 0;
    });
  }, [giftcards]);

  // ── Orphaned images logic ──────────────────────────────────────────────────
  const unassignedImages = useMemo(() => {
    const matchedIds = new Set(giftcards.map((c) => c.evidence?.matchedImageId).filter(Boolean));
    return images.filter((img) => !matchedIds.has(img.id));
  }, [images, giftcards]);

  const [editingAmount, setEditingAmount] = useState<string | null>(null);

  const handleAmountChange = (cardId: string, val: string) => {
    updateGiftcard(cardId, 'amount', val);
  };

  // ── Provenance summary counts ─────────────────────────────────────────────
  // A card "has capture" when its evidence has a matchedImageId (new field)
  // or legacy matchedImageId field is set, and status is not skipped/no_capture.
  const withCaptureCount = giftcards.filter((card) => {
    const mid = card.evidence?.matchedImageId;
    const status = card.evidence?.status;
    return !!mid && status !== 'skipped' && status !== 'no_capture';
  }).length;

  const noEvidenceCount = giftcards.length - withCaptureCount;
  const allHaveEvidence = noEvidenceCount === 0;

  // Back step: default to intake since validation now happens there
  const handleBack = () => setStep(backStep ?? 2);

  return (
    <div className="grid grid-cols-1 items-start gap-2 md:grid-cols-12 md:gap-6">
      {/* Left Column: Summary & Info */}
      <Card className="border-border/50 flex flex-col p-1 md:col-span-4 md:space-y-4 md:p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Review</h2>
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px]">
            Step 3
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-800/30 px-2">
            <span className="text-[10px] text-slate-400">Cards</span>
            <p className="text-sm font-semibold text-white">{giftcards.length}</p>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2">
            <span className="text-[10px] text-emerald-400">Total</span>
            <p className="text-sm font-semibold text-emerald-400">${totalAmount.toFixed(2)}</p>
          </div>
        </div>

        {noEvidenceCount > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
            <span className="text-xs text-amber-300">Missing Screenshots</span>
            <span className="text-xs font-semibold text-amber-300">{noEvidenceCount}</span>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3">
          <div>
            <span className="text-[10px] text-emerald-400">You receive</span>
            <p className="text-lg font-semibold text-emerald-400">${totalToReceive.toFixed(2)}</p>
          </div>
          <Badge variant="outline" className="border-emerald-500/30 text-[10px] text-emerald-400">
            {sellRate * 100}%
          </Badge>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleBack} variant="outline" size="sm" className="h-9 flex-1 text-xs">
            Back
          </Button>
          <Button
            onClick={onPublish}
            disabled={isPublishing || giftcards.some((c) => isBlockingEvidenceState(c.evidence?.status))}
            size="sm"
            className="bg-primary hover:bg-primary/90 h-9 flex-1 text-xs font-semibold"
          >
            {isPublishing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : 'Publish'}
          </Button>
        </div>
      </Card>

      {/* Right Column: Cards Preview */}
      <Card className="border-border bg-card/50 flex min-h-100 flex-col p-1 backdrop-blur-sm md:col-span-8 md:min-h-125 md:p-6">
        <div className="mb-2 flex items-center justify-between md:mb-6">
          <Label className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase md:text-sm">Cards</Label>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">
              {giftcards.length} Total
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
          {sortedGiftcards.map((card, idx) => {
            const matchedImageId = card.evidence?.matchedImageId;
            const evidenceStatus = card.evidence?.status;
            // A card has capture if there is a linked image ID, regardless of AI extraction success
            const hasCapture = !!matchedImageId;

            const config = STATUS_CONFIG[evidenceStatus as ValidationState] || STATUS_CONFIG.no_capture;
            const Icon = config.icon;
            const isBlocking = isBlockingEvidenceState(evidenceStatus as ValidationState);

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  'group border-border bg-muted/20 relative overflow-hidden rounded-xl border p-1.5 transition-all md:p-3',
                  isBlocking ? 'border-primary/40 bg-primary/5 ring-primary/20 shadow-sm ring-1' : 'hover:border-primary/30',
                )}
              >
                <div className="flex flex-col gap-2">
                  {/* Header Row: Index, Amount and Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="bg-primary/20 text-primary flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black">
                        {idx + 1}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <span className="text-foreground text-base font-black md:text-xl">${card.amount || '0.00'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {hasCapture ? (
                        <Badge className={cn('px-1 py-0 text-[10px]', config.color)}>
                          <Icon className="mr-1 h-3 w-3" />
                          {evidenceStatus === 'no_capture' ? 'Manual review' : config.label}
                        </Badge>
                      ) : (
                        <Badge className="border-slate-500/30 bg-slate-500/20 px-1 py-0 text-[10px] text-slate-400">
                          <ImageOff className="mr-1 h-3 w-3" />
                          No capture
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Data Row: Code and PIN with Thumbnail/Camera */}
                  <div className="flex flex-col gap-1.5 md:mt-1">
                    <div className="flex items-center justify-between text-[11px] md:text-sm">
                      <span className="text-muted-foreground tracking-tighter uppercase">Code</span>
                      <div className="flex items-center gap-2 overflow-hidden">
                        {/* Thumbnail / Add Image Button */}
                        <div className="shrink-0">
                          {hasCapture ? (
                            <button
                              onClick={() => setPreviewImage(matchedImageId!)}
                              className="border-border hover:border-primary/50 group/thumb h-6 w-6 overflow-hidden rounded border transition-colors md:h-8 md:w-8"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imageMap.get(matchedImageId!)?.previewUrl}
                                alt=""
                                className="h-full w-full object-cover transition-transform group-hover/thumb:scale-110"
                              />
                            </button>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={processingCardId === card.id}
                              onClick={() => {
                                // Trigger file input for this specific card
                                const input = document.getElementById(`file-input-${card.id}`) as HTMLInputElement;
                                input?.click();
                              }}
                              className="border-border hover:bg-primary/5 hover:text-primary h-6 w-6 rounded border bg-transparent md:h-8 md:w-8"
                            >
                              {processingCardId === card.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                            </Button>
                          )}
                          {/* Individual hidden input for this card */}
                          <input
                            id={`file-input-${card.id}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileSelect(e, card.id)}
                          />
                        </div>
                        <span className="text-foreground truncate font-mono font-bold">{card.claimCode}</span>
                      </div>
                    </div>
                    {card.pinCode && (
                      <div className="flex items-center justify-between text-[11px] md:text-sm">
                        <span className="text-muted-foreground tracking-tighter uppercase">PIN</span>
                        <span className="text-muted-foreground font-mono">{card.pinCode}</span>
                      </div>
                    )}
                  </div>

                  {/* Conflict Resolution Boxes */}
                  {evidenceStatus === 'amount_mismatch' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="border-border mt-1 space-y-2 overflow-hidden rounded-lg border bg-amber-500/10 p-2"
                    >
                      <p className="text-[10px] font-bold text-amber-300 md:text-xs">Amount Mismatch</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="rounded border border-amber-500/10 bg-black/20 p-1.5">
                          <p className="text-[9px] text-amber-200/50 uppercase">Written</p>
                          <p className="text-xs font-black text-white">${card.amount}</p>
                        </div>
                        <div className="rounded border border-emerald-500/10 bg-black/20 p-1.5">
                          <p className="text-[9px] text-emerald-200/50 uppercase">In Picture</p>
                          <p className="text-xs font-black text-emerald-400">${card.evidence?.extractedAmount || '?'}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveAmountMismatch(card.id, 'keep-declared')}
                          className="h-7 flex-1 border-amber-500/20 bg-amber-500/5 px-2 text-[9px] font-bold text-amber-200 hover:bg-amber-500/10"
                        >
                          Keep Written
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => resolveAmountMismatch(card.id, 'accept-extracted')}
                          className="h-7 flex-1 bg-emerald-500/20 px-2 text-[9px] font-bold text-emerald-400 hover:bg-emerald-500/30"
                        >
                          Use Photo
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {evidenceStatus === 'fuzzy_match' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="border-border mt-1 space-y-2 overflow-hidden rounded-lg border bg-purple-500/10 p-2"
                    >
                      <p className="text-[10px] font-bold text-purple-300 md:text-xs">Similar Code Found</p>
                      <div className="rounded border border-purple-500/10 bg-black/20 p-1.5">
                        <p className="text-[9px] text-purple-200/50 uppercase">Code in Photo</p>
                        <p className="font-mono text-[10px] font-bold text-purple-300">
                          {(() => {
                            const code = card.evidence?.extractedCode;
                            if (!code) return '—';
                            const normalized = normalizeClaimCode(code);
                            return normalized ? formatClaimCodeCanonical(normalized) : code;
                          })()}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => confirmFuzzyMatch(card.id)}
                          className="h-7 flex-1 bg-purple-500/20 px-2 text-[9px] font-bold text-purple-300 hover:bg-purple-500/30"
                        >
                          Yes, it's correct
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => rejectFuzzyMatch(card.id)}
                          className="h-7 flex-1 px-2 text-[9px] font-bold text-slate-400"
                        >
                          No, it's different
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div
                  className={cn(
                    'absolute top-0 right-0 -mt-8 -mr-8 h-12 w-12 rounded-full transition-transform duration-500 group-hover:scale-150',
                    isBlocking ? 'bg-primary/10' : 'bg-primary/5',
                  )}
                />
              </motion.div>
            );
          })}
        </div>

        {/* ── Unassigned Screenshots Gallery ────────────────────────────────── */}
        {unassignedImages.length > 0 && (
          // <div className="border-border mt-6 space-y-3 border-t pt-6">
          //   <div className="flex items-center justify-between">
          //     <div className="flex items-center gap-2">
          //       <ImageIcon className="text-muted-foreground h-4 w-4" />
          //       <h3 className="text-muted-foreground text-xs font-bold tracking-tight uppercase">Unmatched Screenshots</h3>
          //     </div>
          //     <Badge variant="outline" className="border-amber-500/30 text-[10px] text-amber-500/70">
          //       Review for misreads
          //     </Badge>
          //   </div>

          //   <div className="flex flex-wrap gap-2">
          //     {unassignedImages.map((img) => (
          //       <button
          //         key={img.id}
          //         onClick={() => setPreviewImage(img.id)}
          //         className="border-border group/un bg-muted/20 h-12 w-12 overflow-hidden rounded-lg border transition-all hover:border-amber-500/50 md:h-16 md:w-16"
          //       >
          //         {/* eslint-disable-next-line @next/next/no-img-element */}
          //         <img
          //           src={img.previewUrl}
          //           alt="Unmatched capture"
          //           className="h-full w-full object-cover opacity-60 transition-all group-hover/un:scale-110 group-hover/un:opacity-100"
          //         />
          //       </button>
          //     ))}
          //   </div>
          // </div>
          <></>
        )}
      </Card>

      {/* ── Screenshot Preview Modal ──────────────────────────────────── */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-lg border-0 bg-transparent p-0 shadow-none sm:max-w-xl">
          <DialogTitle className="sr-only">Screenshot Preview</DialogTitle>
          <DialogDescription className="sr-only">Preview of the uploaded gift card screenshot</DialogDescription>
          {previewImage && imageMap.has(previewImage) && (
            <div className="relative">
              <button
                onClick={() => setPreviewImage(null)}
                className="bg-background/80 hover:bg-background absolute top-2 right-2 z-10 rounded-full p-1.5 backdrop-blur-sm transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageMap.get(previewImage)!.previewUrl}
                alt="Gift card screenshot"
                className="max-h-[80vh] w-full rounded-xl object-contain shadow-2xl"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
