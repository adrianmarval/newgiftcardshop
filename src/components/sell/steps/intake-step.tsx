'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  HelpCircle,
  ImageIcon,
  Info,
  Loader2,
  MinusCircle,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSellFlow } from '@/hooks/use-sell-flow';
import { BulkPasteDialog } from '@/components/sell/bulk-paste-dialog';
import { ImageDropzone } from '@/components/sell/image-dropzone';
import { useAction } from 'next-safe-action/hooks';
import { uploadProvenanceImage, extractDraftBatch } from '@/actions/giftcard-validation-actions';
import type { ParsedGiftcard } from '@/types';
import type { SellFlowImage } from '@/types/flows/sell-flow';
import { isBlockingEvidenceState, type ValidationState } from '@/types/sell/validation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const INTAKE_STATUS_CONFIG: Record<ValidationState, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  verified: { label: 'Verified', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  amount_mismatch: { label: 'Review amount', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: AlertCircle },
  code_new_detected: { label: 'New code', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: HelpCircle },
  no_capture: { label: 'No capture', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: ImageIcon },
  capture_mismatch: { label: 'Incorrect capture', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: AlertCircle },
  processing_error: { label: 'Error', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: AlertCircle },
  fuzzy_match: { label: 'Review code', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: HelpCircle },
  skipped: { label: 'No capture', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: MinusCircle },
};

export function IntakeStep() {
  const {
    giftcards,
    images,
    removeGiftcard,
    updateGiftcard,
    handleBulkImport,
    setStep,
    addImage,
    removeImage,
    clearImages,
    ingestOCRDraft,
    confirmFuzzyMatch,
    rejectFuzzyMatch,
    resolveAmountMismatch,
    setCardValidationResult,
  } = useSellFlow();

  const [showBulkPasteDialog, setShowBulkPasteDialog] = useState(false);
  const [showOcrDialog, setShowOcrDialog] = useState(false);
  const [storeDuplicateCount, setStoreDuplicateCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const handleImport = (cards: ParsedGiftcard[]) => {
    const result = handleBulkImport(cards);
    setStoreDuplicateCount(result.duplicateCount);
  };

  const handleFilesUpload = async (files: FileList | File[]) => {
    const filesArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (filesArray.length === 0) {
      toast.error('Select valid images');
      return;
    }

    setIsUploading(true);
    let uploaded = 0;

    for (const file of filesArray) {
      try {
        const result = await uploadProvenanceImage({ file });
        if (result.data?.success && result.data.compressedData) {
          const imageId = `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const newImage: SellFlowImage = {
            id: imageId,
            compressedData: result.data.compressedData,
            previewUrl: URL.createObjectURL(file),
          };
          addImage(newImage);
          uploaded++;
        } else {
          toast.error(`Error con ${file.name}`, { description: result.data?.error || 'Error al subir' });
        }
      } catch {
        toast.error(`Error con ${file.name}`);
      }
    }

    setIsUploading(false);
    if (uploaded > 0) {
      toast.success(`${uploaded} image${uploaded > 1 ? 's' : ''} uploaded`);
    }
  };

  const { execute: runExtraction } = useAction(extractDraftBatch, {
    onExecute: () => {
      setIsExtracting(true);
      setOcrProgress(15);
    },
    onSuccess: ({ data }) => {
      setIsExtracting(false);
      setOcrProgress(100);
      if (data?.success) {
        ingestOCRDraft(data.cards);
        const ignored = data.ignoredImages.length;
        if (ignored > 0) {
          toast.info(`${ignored} image${ignored > 1 ? 's' : ''} without readable code`, {
            description: "You can load them later using import cards, even if it's just one.",
          });
        }
        if (data.cards.length > 0) {
          toast.success(`${data.cards.length} card${data.cards.length > 1 ? 's' : ''} added from OCR`);
        }
        setShowOcrDialog(false);
      } else if (data?.error) {
        toast.error('Extraction error', { description: data.error });
      }
      setTimeout(() => setOcrProgress(0), 400);
    },
    onError: ({ error }) => {
      setIsExtracting(false);
      setOcrProgress(0);
      toast.error('Extraction error', { description: error.serverError || 'Could not read images' });
    },
  });

  const handleExtractAll = () => {
    if (images.length === 0) {
      toast.info('Upload screenshots to use OCR', {
        description: "If you don't have screenshots, load one or more cards from import.",
      });
      return;
    }

    setOcrProgress(35);
    runExtraction({
      images: images.map((img) => ({ id: img.id, compressedData: img.compressedData })),
    });
  };

  const canContinue = giftcards.length > 0 && giftcards.every((card) => card.claimCode && card.amount);
  const hasBlockingConflicts = useMemo(
    () => giftcards.some((card) => isBlockingEvidenceState(card.evidence?.status ?? card.validationState)),
    [giftcards],
  );
  const orderedGiftcards = useMemo(() => {
    return [...giftcards].sort((a, b) => {
      const statusA = a.evidence?.status ?? a.validationState;
      const statusB = b.evidence?.status ?? b.validationState;
      const aBlocking = isBlockingEvidenceState(statusA);
      const bBlocking = isBlockingEvidenceState(statusB);

      if (aBlocking !== bBlocking) {
        return aBlocking ? -1 : 1;
      }

      return Number(a.id) - Number(b.id);
    });
  }, [giftcards]);
  const intakeSummary = useMemo(() => {
    const filledCards = giftcards.filter((card) => card.claimCode && card.amount).length;
    const cardsWithoutEvidence = giftcards.filter((card) => {
      const status = card.evidence?.status ?? card.validationState;
      return status === 'no_capture' || status === 'skipped' || !status;
    }).length;
    const cardsWithFixes = giftcards.filter((card) => isBlockingEvidenceState(card.evidence?.status ?? card.validationState)).length;

    return {
      filledCards,
      cardsWithoutEvidence,
      cardsWithFixes,
    };
  }, [giftcards]);
  const cardsWithPartialCapture = useMemo(
    () =>
      giftcards.filter((card) => {
        const status = card.evidence?.status ?? card.validationState;
        const hasCapture = !!(card.evidence?.matchedImageId ?? card.matchedImageId);
        const hasExtractedCode = !!(card.evidence?.extractedCode ?? card.extractedCode);
        const hasExtractedAmount = !!(card.evidence?.extractedAmount ?? card.extractedAmount);
        return hasCapture && hasExtractedCode && !hasExtractedAmount && status === 'verified';
      }).length,
    [giftcards],
  );
  const needsManualAmount = (card: (typeof giftcards)[number]) => {
    const status = card.evidence?.status ?? card.validationState;
    const hasCapture = !!(card.evidence?.matchedImageId ?? card.matchedImageId);
    const hasExtractedCode = !!(card.evidence?.extractedCode ?? card.extractedCode);
    const hasExtractedAmount = !!(card.evidence?.extractedAmount ?? card.extractedAmount);
    return hasCapture && hasExtractedCode && !hasExtractedAmount && !card.amount && status === 'verified';
  };
  const blockingCards = orderedGiftcards.filter((card) => isBlockingEvidenceState(card.evidence?.status ?? card.validationState));
  const readyCards = orderedGiftcards.filter((card) => !isBlockingEvidenceState(card.evidence?.status ?? card.validationState));

  return (
    <>
      <BulkPasteDialog open={showBulkPasteDialog} onOpenChange={setShowBulkPasteDialog} onImport={handleImport} />
      <Dialog open={showOcrDialog} onOpenChange={setShowOcrDialog}>
        <DialogContent className="border-border bg-card max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              Extract cards with AI <Sparkles className="mr-3 h-4 w-4" />
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Extract and validate codes and amounts from screenshots using AI.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isUploading && (
              <div className="text-primary flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading images...
              </div>
            )}

            {isExtracting && (
              <div className="border-primary/20 bg-primary/5 space-y-2 rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="text-primary flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing screenshots with AI...</span>
                  </div>
                  <span className="text-primary font-semibold">{ocrProgress}%</span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <motion.div
                    className="bg-primary h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${ocrProgress}%` }}
                    transition={{ ease: 'easeOut', duration: 0.35 }}
                  />
                </div>
                <p className="text-muted-foreground text-xs">We are reading codes and amounts from the uploaded screenshots.</p>
              </div>
            )}

            {!isExtracting && images.length > 0 && (
              <div className="rounded-xl border border-slate-500/20 bg-slate-500/5 px-3 py-2 text-xs text-slate-400">
                Ready to analyze {images.length} screenshot{images.length !== 1 ? 's' : ''}.
              </div>
            )}

            <ImageDropzone
              images={images}
              onAdd={handleFilesUpload}
              onRemove={removeImage}
              onClear={clearImages}
              maxHeight="max-h-[320px]"
              emptySublabel="Drag screenshots or click to select them. Once ready, run the extraction."
            />

            <div className="flex flex-col space-y-2 rounded-xl border border-slate-500/20 bg-slate-500/5 p-3">
              <Button onClick={handleExtractAll} disabled={isUploading || isExtracting || images.length === 0} className="min-w-40">
                {isExtracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Extract now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {storeDuplicateCount > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-2">
            <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400">
              <Info className="h-4 w-4" />
              <AlertDescription className="ml-2">
                {storeDuplicateCount} duplicate code{storeDuplicateCount !== 1 ? 's were' : ' was'} already in the batch and{' '}
                {storeDuplicateCount !== 1 ? 'were' : 'was'} not added again.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid h-full grid-cols-1 items-start gap-2 pb-20 md:grid-cols-12 md:gap-6 md:pb-0">
        <Card className="border-border bg-card/50 sticky top-0 z-20 flex h-auto flex-col space-y-2.5 p-2 backdrop-blur-sm md:col-span-3 md:space-y-4 md:p-4">
          <div className="px-1 md:px-2">
            <h2 className="text-foreground text-lg font-bold md:text-xl">Load Cards</h2>
            <p className="text-muted-foreground hidden text-[10px] md:block md:text-xs">Load gift cards to sell them</p>
          </div>

          <div className="flex flex-col gap-1.5 md:gap-2">
            <Button
              onClick={() => setShowBulkPasteDialog(true)}
              variant="outline"
              className="border-border text-primary hover:bg-primary/10 hover:text-primary h-8 w-full justify-start px-2 text-xs md:h-9 md:px-3"
            >
              <Clipboard className="mr-2 h-3.5 w-3.5" /> Upload from Text
            </Button>
            <Button
              onClick={() => setShowOcrDialog(true)}
              disabled={isUploading || isExtracting}
              variant="outline"
              className="border-border text-primary hover:bg-primary/10 hover:text-primary h-8 w-full justify-start px-2 text-xs md:h-9 md:px-3"
            >
              {isExtracting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}
              Upload Screenshots
            </Button>
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            <Button onClick={() => setStep(1)} variant="outline" size="sm" className="h-8 text-xs md:h-9">
              Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={!canContinue || hasBlockingConflicts} size="sm" className="h-8 text-xs md:h-9">
              Continue
            </Button>
          </div>
        </Card>

        <div className="space-y-4 md:col-span-9">
          <Card className="border-border bg-card/50 flex min-h-100 flex-col p-2 backdrop-blur-sm md:min-h-125 md:p-6">
            <CardHeader>
              <CardTitle>Loaded cards</CardTitle>
            </CardHeader>

            <CardContent
              className={cn(
                'custom-scrollbar max-h-125 flex-1 space-y-3 overflow-y-auto pr-1 md:max-h-150 md:space-y-4 md:pr-2',
                giftcards.length === 0 && 'hidden',
              )}
            >
              {blockingCards.length > 0 && (
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2">
                  <div className="flex-1 bg-amber-500/20 h-[1px]" />
                  <span className="text-[10px] font-bold tracking-[0.2em] text-amber-400 uppercase">Require attention</span>
                  <div className="flex-1 bg-amber-500/20 h-[1px]" />
                </div>
              )}

              <AnimatePresence mode="popLayout">
                {blockingCards.map((card, idx) =>
                  (() => {
                    const liveCard = giftcards.find((current) => current.id === card.id) ?? card;
                    const status = liveCard.evidence?.status ?? liveCard.validationState ?? 'no_capture';
                    const config = INTAKE_STATUS_CONFIG[status];
                    const Icon = config.icon;

                    return (
                      <motion.div
                        key={liveCard.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="group border-border bg-muted/20 hover:bg-muted/35 relative space-y-2 rounded-xl border p-2 transition-all"
                      >
                        <div className="flex flex-col gap-2 md:grid md:grid-cols-[auto_140px_120px_minmax(240px,1fr)_auto] md:items-center md:gap-2">
                          {/* Row 1: Index, Status (mobile) and Trash */}
                          <div className="flex items-center justify-between md:contents">
                            <div className="flex items-center gap-2">
                              <div className="border-border bg-muted text-muted-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold">
                                {idx + 1}
                              </div>
                              <div className="flex flex-wrap items-center gap-1 md:hidden">
                                <Badge className={`${config.color} px-1.5 py-0 text-[10px]`}>
                                  <Icon className="mr-1 h-2.5 w-2.5" />
                                  {config.label}
                                </Badge>
                              </div>
                              <div className="hidden flex-wrap items-center gap-1 md:flex">
                                <Badge className={`${config.color} px-1.5 py-0 text-[10px]`}>
                                  <Icon className="mr-1 h-2.5 w-2.5" />
                                  {config.label}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeGiftcard(liveCard.id)}
                              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-7 w-7 md:hidden"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          {/* Inputs Grid/Stack */}
                          <div className="grid grid-cols-2 gap-1.5 md:contents">
                            <div className="relative md:max-w-[140px]">
                              <span className="text-muted-foreground/50 absolute top-2 left-2 text-[10px]">$</span>
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={liveCard.amount}
                                onChange={(e) => updateGiftcard(liveCard.id, 'amount', e.target.value)}
                                className="border-border bg-muted/50 text-foreground focus:border-primary/50 h-8 pl-5 text-sm"
                              />
                            </div>

                            <Input
                              type="password"
                              placeholder="PIN"
                              value={liveCard.pinCode || ''}
                              onChange={(e) => updateGiftcard(liveCard.id, 'pinCode', e.target.value)}
                              className="border-border bg-muted/50 text-foreground focus:border-primary/50 h-8 font-mono text-sm md:max-w-[120px]"
                            />
                          </div>

                          <div className="min-w-0 md:contents">
                            <Input
                              placeholder="Claim code"
                              value={liveCard.claimCode}
                              onChange={(e) => updateGiftcard(liveCard.id, 'claimCode', e.target.value)}
                              className="border-border bg-muted/50 text-foreground focus:border-primary/50 h-8 font-mono text-sm"
                            />
                          </div>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeGiftcard(liveCard.id)}
                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive hidden h-7 w-7 shrink-0 rounded-lg md:flex"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        {needsManualAmount(liveCard) && (
                          <div className="border-border mt-1 rounded-lg border bg-blue-500/10 px-3 py-2">
                            <p className="text-sm font-semibold text-blue-300">Enter the amount manually</p>
                            <p className="text-xs text-blue-200/80">
                              The screenshot confirmed the code, but could not detect the amount for this card.
                            </p>
                          </div>
                        )}

                        {status === 'amount_mismatch' && (
                          <div className="border-border mt-1 space-y-2 rounded-lg border bg-amber-500/10 p-2.5">
                            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-xl font-semibold text-amber-300">Wrong amount detected from screenshot</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2 md:min-w-[280px]">
                                <div className="rounded-lg border border-amber-500/15 bg-black/10 px-3 py-2">
                                  <p className="text-[10px] font-semibold tracking-wide text-amber-200/70 uppercase">Correct Amount</p>
                                  <p className="mt-0.5 text-lg font-black text-amber-400">${liveCard.evidence?.extractedAmount ?? '—'}</p>
                                </div>
                                <div className="rounded-lg border border-slate-500/15 bg-black/10 px-3 py-2">
                                  <p className="text-[10px] font-semibold tracking-wide text-slate-300/70 uppercase">Incorrect Amount</p>
                                  <p className="mt-0.5 text-lg font-black text-white">${liveCard.amount || '—'}</p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                              <Button
                                size="sm"
                                onClick={() => resolveAmountMismatch(liveCard.id, 'keep-declared')}
                                className="h-8 bg-slate-500/20 px-3 text-xs font-bold text-slate-300 hover:bg-slate-500/30"
                              >
                                Keep typed amount
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => resolveAmountMismatch(liveCard.id, 'accept-extracted')}
                                className="h-8 bg-amber-500/20 px-3 text-xs font-bold text-amber-400 hover:bg-amber-500/30"
                              >
                                Use screenshot amount
                              </Button>
                            </div>
                          </div>
                        )}

                        {status === 'fuzzy_match' && (
                          <div className="border-border mt-1 space-y-2 rounded-lg border bg-purple-500/10 p-2.5">
                            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-xl text-purple-200/80">
                                  The screenshot found a code very similar to the one you loaded.
                                </p>
                              </div>
                              <div className="rounded-lg border border-purple-500/15 bg-black/10 px-3 py-2 md:min-w-[280px]">
                                <p className="text-[10px] font-semibold tracking-wide text-purple-200/70 uppercase">Code in screenshot</p>
                                <p className="mt-0.5 font-mono text-sm font-bold break-all text-purple-300">
                                  {liveCard.evidence?.extractedCode ?? '—'}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                              <Button
                                size="sm"
                                onClick={() => confirmFuzzyMatch(liveCard.id)}
                                className="h-8 bg-purple-500/20 px-3 text-xs font-bold text-purple-400 hover:bg-purple-500/30"
                              >
                                Yes, it's the same code
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => rejectFuzzyMatch(liveCard.id)}
                                className="h-8 bg-slate-500/20 px-3 text-xs font-bold text-slate-400 hover:bg-slate-500/30"
                              >
                                No, keep both codes
                              </Button>
                            </div>
                          </div>
                        )}

                        {liveCard.amount && liveCard.claimCode && !isBlockingEvidenceState(status) && (
                          <div className="bg-primary absolute top-1/2 -left-1 h-8 w-1 -translate-y-1/2 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                        )}
                      </motion.div>
                    );
                  })(),
                )}
              </AnimatePresence>

              {readyCards.length > 0 && (
                <>
                  <div className="mt-3 mb-2 flex items-center gap-2 rounded-lg border border-slate-500/20 bg-slate-500/5 px-2">
                    <div className="flex-1 bg-slate-500/20 h-[1px]" />
                    <span className="text-[10px] font-bold tracking-[0.2em] text-slate-300 uppercase">Ready</span>
                    <div className="flex-1 bg-slate-500/20 h-[1px]" />
                  </div>

                  <AnimatePresence mode="popLayout">
                    {readyCards.map((card, idx) => {
                      const status = card.evidence?.status ?? card.validationState ?? 'no_capture';
                      const config = INTAKE_STATUS_CONFIG[status];
                      const Icon = config.icon;

                      return (
                        <motion.div
                          key={card.id}
                          layout
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          className="group border-border bg-muted/15 hover:bg-muted/25 relative rounded-xl border p-2 transition-all"
                        >
                          <div className="flex flex-col gap-2 md:grid md:grid-cols-[auto_140px_120px_minmax(260px,1fr)_auto] md:items-center md:gap-2">
                            {/* Row 1: Index, Status (mobile) and Trash */}
                            <div className="flex items-center justify-between md:contents">
                              <div className="flex items-center gap-2">
                                <div className="border-border bg-muted text-muted-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold">
                                  {blockingCards.length + idx + 1}
                                </div>
                                <div className="flex flex-wrap items-center gap-1 md:hidden">
                                  <Badge className={`${config.color} px-1.5 py-0 text-[10px]`}>
                                    <Icon className="mr-1 h-2.5 w-2.5" />
                                    {config.label}
                                  </Badge>
                                </div>
                                <div className="hidden flex-wrap items-center gap-1 md:flex">
                                  <Badge className={`${config.color} px-1.5 py-0 text-[10px]`}>
                                    <Icon className="mr-1 h-2.5 w-2.5" />
                                    {config.label}
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => removeGiftcard(card.id)}
                                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-7 w-7 md:hidden"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            {/* Inputs Grid/Stack */}
                            <div className="grid grid-cols-2 gap-1.5 md:contents">
                              <div className="relative md:max-w-[140px]">
                                <span className="text-muted-foreground/50 absolute top-2 left-2 text-[10px]">$</span>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  value={card.amount}
                                  onChange={(e) => updateGiftcard(card.id, 'amount', e.target.value)}
                                  className="border-border bg-muted/50 text-foreground focus:border-primary/50 h-8 pl-5 text-sm"
                                />
                              </div>

                              <Input
                                type="password"
                                placeholder="PIN"
                                value={card.pinCode || ''}
                                onChange={(e) => updateGiftcard(card.id, 'pinCode', e.target.value)}
                                className="border-border bg-muted/50 text-foreground focus:border-primary/50 h-8 font-mono text-sm md:max-w-[120px]"
                              />
                            </div>

                            <div className="min-w-0 md:contents">
                              <Input
                                placeholder="Claim code"
                                value={card.claimCode}
                                onChange={(e) => updateGiftcard(card.id, 'claimCode', e.target.value)}
                                className="border-border bg-muted/50 text-foreground focus:border-primary/50 h-8 font-mono text-sm"
                              />
                            </div>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeGiftcard(card.id)}
                              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive hidden h-7 w-7 shrink-0 rounded-lg md:flex"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>

                          {needsManualAmount(card) && (
                            <div className="border-border mt-1 rounded-lg border bg-blue-500/10 px-3 py-2">
                              <p className="text-sm font-semibold text-blue-300">Enter the amount manually</p>
                              <p className="text-xs text-blue-200/80">
                                The screenshot confirmed the code, but could not detect the amount for this card.
                              </p>
                            </div>
                          )}

                          {card.amount && card.claimCode && !isBlockingEvidenceState(status) && (
                            <div className="bg-primary absolute top-1/2 -left-1 h-8 w-1 -translate-y-1/2 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </>
              )}
            </CardContent>

            {giftcards.length === 0 && (
              <div className="bg-muted/20 mt-3 flex flex-col items-center justify-center rounded-2xl p-12">
                <div className="bg-muted mb-4 rounded-full p-4">
                  <Upload className="text-muted-foreground/50 h-8 w-8" />
                </div>
                <h3 className="mb-1 font-bold">You haven't loaded any cards yet</h3>
                <p className="text-muted-foreground text-sm">Use OCR or import one or more cards to get started.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
