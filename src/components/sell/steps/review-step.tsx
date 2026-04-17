'use client';

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, HelpCircle, ImageIcon, ImageOff, Loader2, MinusCircle, Trash2, X, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useSellFlow } from '@/hooks/use-sell-flow';
import { isBlockingEvidenceState, type ValidationState } from '@/types/sell/validation';
import type { SellFlowGiftcard, SellFlowImage } from '@/types/flows/sell-flow';
import type { ReviewStepProps } from '../types';
import { cn } from '@/lib/utils';
import { useAction } from 'next-safe-action/hooks';
import { uploadProvenanceImage, extractDraftBatch } from '@/actions/giftcard-validation-actions';
import { toast } from 'sonner';
import { normalizeClaimCode, formatClaimCodeCanonical } from '@/lib/utils/claim-code-parser';

// ─── Status config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ValidationState, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  verified: { label: 'Verified', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  amount_mismatch: { label: 'Review amount', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: AlertCircle },
  code_new_detected: { label: 'New code', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: HelpCircle },
  no_capture: { label: 'No capture', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: ImageIcon },
  capture_mismatch: { label: 'Incorrect capture', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: AlertCircle },
  processing_error: { label: 'Error', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: AlertCircle },
  fuzzy_match: { label: 'Review code', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: HelpCircle },
  skipped: { label: 'No capture', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: MinusCircle },
  amount_not_found: { label: 'Missing amount', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: AlertCircle },
};

const STATUS_INDICATOR_COLORS: Record<ValidationState, string> = {
  verified: 'bg-emerald-500',
  amount_mismatch: 'bg-amber-500',
  code_new_detected: 'bg-blue-500',
  no_capture: 'bg-slate-500',
  capture_mismatch: 'bg-orange-500',
  processing_error: 'bg-red-500',
  fuzzy_match: 'bg-purple-500',
  skipped: 'bg-slate-500',
  amount_not_found: 'bg-blue-500',
};

export function ReviewStep({ onPublish, isPublishing, brandName, countryName, sellRate, backStep }: ReviewStepProps) {
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

  // ── Sorting Logic: Priorities first ─────────────────────────────────────────
  const sortedGiftcards = useMemo(() => {
    return [...giftcards].sort((a, b) => {
      const aBlocked = isBlockingEvidenceState(a.evidence?.status ?? a.validationState);
      const bBlocked = isBlockingEvidenceState(b.evidence?.status ?? b.validationState);
      if (aBlocked && !bBlocked) return -1;
      if (!aBlocked && bBlocked) return 1;
      return 0; // Maintain original order otherwise
    });
  }, [giftcards]);

  // ── Orphaned images logic ──────────────────────────────────────────────────
  const unassignedImages = useMemo(() => {
    const matchedIds = new Set(giftcards.map((c) => c.evidence?.matchedImageId ?? c.matchedImageId).filter(Boolean));
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
    const mid = card.evidence?.matchedImageId ?? card.matchedImageId;
    const status = card.evidence?.status ?? card.validationState;
    return !!mid && status !== 'skipped' && status !== 'no_capture';
  }).length;

  const noEvidenceCount = giftcards.length - withCaptureCount;
  const allHaveEvidence = noEvidenceCount === 0;

  // Back step: default to intake since validation now happens there
  const handleBack = () => setStep(backStep ?? 2);

  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-12 md:gap-6">
      {/* Left Column: Summary & Info */}
      <Card className="border-border bg-card/50 flex h-auto flex-col space-y-2.5 p-2 backdrop-blur-sm md:col-span-4 md:h-full md:space-y-6 md:p-6">
        <div>
          <div className="mb-0.5 flex items-center gap-2">
            <h2 className="text-foreground text-lg font-bold md:text-2xl">Review and publish</h2>
            <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary text-[9px] md:text-xs">
              Final step
            </Badge>
          </div>
          <p className="text-muted-foreground hidden text-[10px] md:block md:text-base">Final review before publishing.</p>
        </div>

        <div className="hidden grid-cols-1 gap-2 md:grid md:gap-4">
          <div className="border-border bg-muted/50 space-y-2 rounded-xl border p-2 md:p-4">
            <div className="flex items-center justify-between text-xs md:text-base">
              <span className="text-muted-foreground tracking-tight uppercase">Brand</span>
              <span className="text-foreground font-bold">{brandName}</span>
            </div>
            <div className="flex items-center justify-between text-xs md:text-base">
              <span className="text-muted-foreground tracking-tight uppercase">Country</span>
              <span className="text-foreground font-bold">{countryName}</span>
            </div>
            <div className="flex items-center justify-between text-xs md:text-base">
              <span className="text-muted-foreground tracking-tight uppercase">Cards</span>
              <span className="text-foreground font-bold">{giftcards.length} items</span>
            </div>
            <div className="flex items-center justify-between text-xs md:text-base">
              <span className="text-muted-foreground tracking-tight uppercase">Total</span>
              <span className="text-primary font-bold">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 md:space-y-4">
          {noEvidenceCount > 0 && (
            <div className="rounded-xl border border-slate-500/20 bg-slate-500/5 p-2 md:p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-slate-400" />
                <p className="text-[10px] font-semibold text-slate-300 md:text-sm">Incomplete Batch</p>
              </div>
              <p className="mt-1 text-[10px] text-slate-400 md:text-xs">
                {noEvidenceCount} card{noEvidenceCount > 1 ? 's' : ''} without capture.
              </p>
            </div>
          )}

          {unassignedImages.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2 md:p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-amber-400 h-3 w-3" />
                <p className="text-[10px] font-semibold text-amber-300 md:text-sm">Orphaned Captures</p>
              </div>
              <p className="mt-1 text-[10px] text-amber-500/70 md:text-xs">
                {unassignedImages.length} image{unassignedImages.length > 1 ? 's' : ''} didn't match any code. 
                Possible OCR misread.
              </p>
            </div>
          )}

          <div className="border-primary/20 bg-primary/5 space-y-1.5 rounded-xl border p-2 md:p-4">
            <div className="flex items-center justify-between text-[10px] md:text-xs">
              <span className="text-muted-foreground font-semibold tracking-wider uppercase">Estimated payout</span>
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary px-1 py-0 text-[10px] md:text-sm">
                {sellRate * 100}%
              </Badge>
            </div>
            <div className="text-primary text-2xl font-black md:text-4xl">${totalToReceive.toFixed(2)}</div>
          </div>
        </div>

        <div className="border-border space-y-3 border-t pt-3 md:pt-6">
          <div className="flex gap-2">
            <Button
              onClick={handleBack}
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:bg-muted h-9 flex-1 text-xs md:h-11 md:text-base"
            >
              Back
            </Button>
            <Button
              onClick={onPublish}
              disabled={isPublishing || giftcards.some((c) => isBlockingEvidenceState(c.evidence?.status ?? c.validationState))}
              size="sm"
              className="bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90 h-9 flex-2 text-xs font-bold shadow-lg md:h-11 md:text-base"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish Batch'
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Right Column: Cards Preview */}
      <Card className="border-border bg-card/50 flex min-h-100 flex-col p-2 backdrop-blur-sm md:col-span-8 md:min-h-125 md:p-6">
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
            const matchedImageId = card.evidence?.matchedImageId ?? card.matchedImageId;
            const evidenceStatus = card.evidence?.status ?? card.validationState;
            const hasCapture = !!matchedImageId && evidenceStatus !== 'skipped' && evidenceStatus !== 'no_capture';

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
                  isBlocking ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20 shadow-sm' : 'hover:border-primary/30'
                )}
              >
                <div className="flex flex-col gap-2">
                  {/* Header Row: Index, Amount and Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="bg-primary/20 text-primary flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black">
                        {idx + 1}
                      </div>
                      <div className={cn(
                        "flex items-center gap-0.5 rounded px-1 transition-all",
                        evidenceStatus === 'amount_not_found' && "bg-blue-500/20 ring-1 ring-blue-500/50"
                      )}>
                        <span className="text-foreground -mr-1 text-base font-black opacity-50 md:text-xl">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={card.amount}
                          onChange={(e) => handleAmountChange(card.id, e.target.value)}
                          className="text-foreground bg-transparent w-20 border-none p-0 text-base font-black focus:ring-0 md:text-xl"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {hasCapture ? (
                        <Badge className={cn('px-1 py-0 text-[10px]', config.color)}>
                          <Icon className="mr-1 h-3 w-3" />
                          {config.label}
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
                              {processingCardId === card.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Camera className="h-3 w-3" />
                              )}
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
                        <div className="bg-black/20 rounded border border-amber-500/10 p-1.5">
                          <p className="text-[9px] text-amber-200/50 uppercase">Written</p>
                          <p className="text-xs font-black text-white">${card.amount}</p>
                        </div>
                        <div className="bg-black/20 rounded border border-emerald-500/10 p-1.5">
                          <p className="text-[9px] text-emerald-200/50 uppercase">In Picture</p>
                          <p className="text-xs font-black text-emerald-400">
                            ${card.evidence?.extractedAmount || card.extractedAmount || '?'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveAmountMismatch(card.id, 'keep-declared')}
                          className="border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 h-7 flex-1 px-2 text-[9px] font-bold text-amber-200"
                        >
                          Keep Written
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => resolveAmountMismatch(card.id, 'accept-extracted')}
                          className="bg-emerald-500/20 hover:bg-emerald-500/30 h-7 flex-1 px-2 text-[9px] font-bold text-emerald-400"
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
                      <div className="bg-black/20 rounded border border-purple-500/10 p-1.5">
                        <p className="text-[9px] text-purple-200/50 uppercase">Code in Photo</p>
                        <p className="font-mono text-[10px] font-bold text-purple-300">
                          {(() => {
                            const code = card.evidence?.extractedCode || card.extractedCode;
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
                          className="bg-purple-500/20 hover:bg-purple-500/30 h-7 flex-1 px-2 text-[9px] font-bold text-purple-300"
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

                <div className={cn(
                  "absolute top-0 right-0 -mt-8 -mr-8 h-12 w-12 rounded-full transition-transform duration-500 group-hover:scale-150",
                  isBlocking ? "bg-primary/10" : "bg-primary/5"
                )} />
              </motion.div>
            );
          })}
        </div>

        {/* ── Unassigned Screenshots Gallery ────────────────────────────────── */}
        {unassignedImages.length > 0 && (
          <div className="border-border mt-6 space-y-3 border-t pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="text-muted-foreground h-4 w-4" />
                <h3 className="text-muted-foreground text-xs font-bold tracking-tight uppercase">Unmatched Screenshots</h3>
              </div>
              <Badge variant="outline" className="border-amber-500/30 text-amber-500/70 text-[10px]">
                Review for misreads
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {unassignedImages.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setPreviewImage(img.id)}
                  className="border-border hover:border-amber-500/50 group/un h-12 w-12 overflow-hidden rounded-lg border bg-muted/20 transition-all md:h-16 md:w-16"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.previewUrl}
                    alt="Unmatched capture"
                    className="h-full w-full object-cover opacity-60 transition-all group-hover/un:scale-110 group-hover/un:opacity-100"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ── Screenshot Preview Modal ──────────────────────────────────── */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-lg border-0 bg-transparent p-0 shadow-none sm:max-w-xl">
          <DialogTitle className="sr-only">Screenshot Preview</DialogTitle>
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
