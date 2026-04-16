'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useDragControls, animate } from 'framer-motion';
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
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSellFlow } from '@/hooks/use-sell-flow';
import { BulkPasteDialog } from '@/components/sell/bulk-paste-dialog';
import { ImageDropzone } from '@/components/sell/image-dropzone';
import { useAction } from 'next-safe-action/hooks';
import { uploadProvenanceImage, extractDraftBatch } from '@/actions/giftcard-validation-actions';
import type { ParsedGiftcard } from '@/types';
import type { SellFlowImage, SellFlowGiftcard } from '@/types/flows/sell-flow';
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
  amount_not_found: { label: 'Missing amount', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: AlertCircle },
};
// Mapping of solid background colors for the sidebar indicator on mobile
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
  const [cardIdToDelete, setCardIdToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleImport = (cards: ParsedGiftcard[]) => {
    const result = handleBulkImport(cards);
    if (result.duplicateCount > 0) {
      toast.info(
        `${result.duplicateCount} código${result.duplicateCount !== 1 ? 's' : ''} duplicado${result.duplicateCount !== 1 ? 's' : ''}`,
        {
          description: `Ya se encuentran en tu lote actual.`,
        },
      );
    }
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

  const needsManualAmount = (card: (typeof giftcards)[number]) => {
    const status = card.evidence?.status ?? card.validationState;
    const hasCapture = !!(card.evidence?.matchedImageId ?? card.matchedImageId);
    const hasExtractedCode = !!(card.evidence?.extractedCode ?? card.extractedCode);
    const hasExtractedAmount = !!(card.evidence?.extractedAmount ?? card.extractedAmount);

    return (
      (hasCapture && hasExtractedCode && !hasExtractedAmount && !card.amount && status === 'verified') || status === 'amount_not_found'
    );
  };

  const filteredGiftcards = useMemo(() => {
    if (!searchTerm) return orderedGiftcards;
    const term = searchTerm.toLowerCase();
    return orderedGiftcards.filter((card) => card.claimCode.toLowerCase().includes(term));
  }, [orderedGiftcards, searchTerm]);

  const blockingCards = filteredGiftcards.filter((card) => isBlockingEvidenceState(card.evidence?.status ?? card.validationState));
  const readyCards = filteredGiftcards.filter((card) => !isBlockingEvidenceState(card.evidence?.status ?? card.validationState));

  const displayItems = useMemo(() => {
    const items: (
      | { type: 'header'; label: string; color: 'amber' | 'slate'; id: string }
      | { type: 'card'; card: SellFlowGiftcard; idx: number; id: string }
    )[] = [];

    if (blockingCards.length > 0) {
      items.push({ type: 'header', label: 'Require attention', color: 'amber', id: 'header-blocking' });
      blockingCards.forEach((card, idx) => {
        items.push({
          type: 'card',
          card: giftcards.find((c) => c.id === card.id) || card,
          idx,
          id: card.id,
        });
      });
    }

    if (readyCards.length > 0) {
      items.push({ type: 'header', label: 'Ready', color: 'slate', id: 'header-ready' });
      readyCards.forEach((card, idx) => {
        items.push({
          type: 'card',
          card,
          idx: blockingCards.length + idx,
          id: card.id,
        });
      });
    }

    return items;
  }, [blockingCards, readyCards, giftcards]);

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

      <div className="flex h-full flex-col gap-2 md:grid md:grid-cols-12 md:items-start md:gap-6">
        <Card className="border-border bg-card/50 flex h-auto flex-none flex-col gap-1.5 p-2 backdrop-blur-sm md:col-span-3 md:gap-4 md:p-4">
          <div className="px-1 md:px-2">
            <h2 className="text-foreground text-lg font-bold md:text-xl">Load Cards</h2>
            <p className="text-muted-foreground hidden text-[10px] md:block md:text-xs">Load gift cards to sell them</p>
          </div>

          <div className="grid grid-cols-2 gap-1.5 md:flex md:flex-col md:gap-2">
            <Button
              onClick={() => setShowBulkPasteDialog(true)}
              variant="outline"
              size="sm"
              className="border-primary/20 bg-primary/5 hover:bg-primary/10 flex h-8 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[10px] whitespace-nowrap md:h-9 md:flex-row md:gap-2 md:text-xs"
            >
              <Clipboard className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="md:hidden">Bulk Paste</span>
              <span className="hidden md:inline">Upload from Text</span>
            </Button>
            <Button
              onClick={() => setShowOcrDialog(true)}
              disabled={isUploading || isExtracting}
              variant="outline"
              size="sm"
              className="border-primary/20 bg-primary/5 hover:bg-primary/10 flex h-8 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[10px] whitespace-nowrap md:h-9 md:flex-row md:gap-2 md:text-xs"
            >
              <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="md:hidden">AI Scan Screenshots</span>
              <span className="hidden md:inline">Extract from Screenshots</span>
            </Button>
          </div>
        </Card>

        <div className="flex min-h-0 flex-1 flex-col md:col-span-9">
          <Card className="border-border bg-card/50 flex min-h-0 flex-1 flex-col px-1 pt-1 pb-4 backdrop-blur-sm md:h-full md:min-h-125 md:p-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-2 py-1 md:px-6 md:py-4">
              <CardTitle className="hidden text-sm font-bold md:block md:text-base">Card list</CardTitle>
              <div className="relative w-full md:max-w-[240px]">
                <Search className="text-muted-foreground absolute top-2 left-2 h-3.5 w-3.5" />
                <Input
                  placeholder="Search by code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-border bg-muted/50 focus:border-primary/50 h-7.5 pl-7 text-[10px] md:h-8 md:text-xs"
                />
              </div>
            </CardHeader>

            <CardContent
              className={cn(
                'custom-scrollbar flex-1 space-y-3 overflow-y-auto px-1 pr-1 md:space-y-4 md:px-2',
                giftcards.length === 0 && 'hidden',
              )}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {displayItems.map((item) =>
                  item.type === 'header' ? (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-2',
                        item.color === 'amber'
                          ? 'mb-2 border border-amber-500/20 bg-amber-500/5'
                          : 'mt-3 mb-2 border border-slate-500/20 bg-slate-500/5',
                      )}
                    >
                      <div className={cn('h-px flex-1', item.color === 'amber' ? 'bg-amber-500/20' : 'bg-slate-500/20')} />
                      <span
                        className={cn(
                          'text-[10px] font-bold tracking-[0.2em] uppercase',
                          item.color === 'amber' ? 'text-amber-400' : 'text-slate-300',
                        )}
                      >
                        {item.label}
                      </span>
                      <div className={cn('h-px flex-1', item.color === 'amber' ? 'bg-amber-500/20' : 'bg-slate-500/20')} />
                    </motion.div>
                  ) : (
                    <GiftcardCard
                      key={item.id}
                      card={item.card}
                      idx={item.idx}
                      onDeleteRequest={(id) => setCardIdToDelete(id)}
                      updateGiftcard={updateGiftcard}
                      needsManualAmount={needsManualAmount}
                      resolveAmountMismatch={resolveAmountMismatch}
                      confirmFuzzyMatch={confirmFuzzyMatch}
                      rejectFuzzyMatch={rejectFuzzyMatch}
                    />
                  ),
                )}
              </AnimatePresence>
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

            <CardFooter className="border-border mt-auto grid grid-cols-2 gap-2 border-t pt-1">
              <Button onClick={() => setStep(1)} variant="outline" size="sm" className="h-8 text-xs font-bold">
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!canContinue || hasBlockingConflicts}
                size="sm"
                className="bg-primary text-primary-foreground h-8 text-xs font-bold"
              >
                Continue
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!cardIdToDelete} onOpenChange={(open) => !open && setCardIdToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The gift card with code{' '}
              <span className="text-foreground font-mono font-bold">
                {giftcards.find((c) => c.id === cardIdToDelete)?.claimCode || '—'}
              </span>{' '}
              will be removed from your current batch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (cardIdToDelete) {
                  removeGiftcard(cardIdToDelete);
                  setCardIdToDelete(null);
                }
              }}
            >
              Delete Card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function GiftcardCard({
  card,
  idx,
  onDeleteRequest,
  updateGiftcard,
  needsManualAmount,
  resolveAmountMismatch,
  confirmFuzzyMatch,
  rejectFuzzyMatch,
}: {
  card: SellFlowGiftcard;
  idx: number;
  onDeleteRequest: (id: string) => void;
  updateGiftcard: (id: string, field: 'amount' | 'claimCode' | 'pinCode', value: string) => void;
  needsManualAmount: (card: SellFlowGiftcard) => boolean;
  resolveAmountMismatch: (id: string, choice: 'keep-declared' | 'accept-extracted' | 'remove') => void;
  confirmFuzzyMatch: (id: string) => void;
  rejectFuzzyMatch: (id: string) => void;
}) {
  const x = useMotionValue(0);
  const dragControls = useDragControls();
  const trashOpacity = useTransform(x, [-100, -80, 0], [1, 1, 0]);
  const trashScale = useTransform(x, [-100, -80, 0], [1, 0.9, 0.5]);

  const status = card.evidence?.status ?? card.validationState ?? 'no_capture';
  const config = INTAKE_STATUS_CONFIG[status as ValidationState];
  const indicatorColor = STATUS_INDICATOR_COLORS[status as ValidationState];
  const Icon = config.icon;

  const bgOpacity = useTransform(x, [-40, 0], [1, 0]);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Mobile Swipe Background */}
      <motion.div style={{ opacity: bgOpacity }} className="absolute inset-0 flex items-center justify-end bg-red-500/90 pr-6 md:hidden">
        <motion.div style={{ opacity: trashOpacity, scale: trashScale }} className="flex flex-col items-center gap-1">
          <Trash2 className="h-5 w-5 text-white" />
          <span className="text-[10px] font-bold text-white uppercase">Delete</span>
        </motion.div>
      </motion.div>

      <motion.div
        layout
        drag="x"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={{ left: 0.1, right: 0.05 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -80) {
            onDeleteRequest(card.id);
          }
          // Snap back to original position
          animate(x, 0, { type: 'spring', bounce: 0, duration: 0.5 });
        }}
        onPointerDown={(e) => dragControls.start(e)}
        style={{ x }}
        className="group border-border bg-card/40 hover:bg-muted/10 relative z-10 touch-pan-y space-y-1.5 rounded-xl border p-1 backdrop-blur-sm transition-all select-none"
      >
        {/* Sidebar indicator (mobile only) */}
        <div className={cn('absolute top-0 bottom-0 left-0 w-1 md:hidden', indicatorColor)} />

        <div className="flex flex-col gap-1.5 md:grid md:grid-cols-[32px_140px_110px_110px_1fr_32px] md:items-center md:gap-2">
          {/* Row 1: Index and Status (Compact) */}
          <div className="flex items-center gap-1.5 md:contents">
            <div className="border-border bg-muted text-muted-foreground hidden h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold md:flex">
              {idx + 1}
            </div>

            {/* Badges - Hidden on Mobile, Visible on Desktop */}
            <div className="hidden flex-wrap items-center gap-1 md:flex">
              <Badge className={`${config.color} px-1.5 py-0 text-[10px]`}>
                <Icon className="mr-1 h-2.5 w-2.5" />
                {config.label}
              </Badge>
            </div>
          </div>

          {/* Inputs Row */}
          <div className="grid grid-cols-[70px_70px_1fr] gap-1 md:contents">
            <div className="relative md:max-w-[140px]">
              <span className="text-muted-foreground/50 absolute top-1.5 left-1.5 text-[9px]">$</span>
              <Input
                type="number"
                placeholder="0.00"
                value={card.amount}
                onChange={(e) => updateGiftcard(card.id, 'amount', e.target.value)}
                className="border-border bg-muted/50 text-foreground focus:border-primary/50 h-7.5 pl-4.5 text-[11px] md:h-8 md:pl-5 md:text-sm"
              />
            </div>

            <Input
              type="password"
              placeholder="PIN"
              value={card.pinCode || ''}
              onChange={(e) => updateGiftcard(card.id, 'pinCode', e.target.value)}
              className="border-border bg-muted/50 text-foreground focus:border-primary/50 h-7.5 px-2 font-mono text-[11px] md:h-8 md:max-w-[120px] md:text-sm"
            />

            <Input
              placeholder="Claim code"
              value={card.claimCode}
              onChange={(e) => updateGiftcard(card.id, 'claimCode', e.target.value)}
              className="border-border bg-muted/50 text-foreground focus:border-primary/50 h-7.5 px-2 font-mono text-[11px] md:h-8 md:text-sm"
            />
          </div>

          {/* Trash Button - Desktop Only */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDeleteRequest(card.id)}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive hidden h-7 w-7 shrink-0 rounded-lg md:flex"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Warning boxes */}
        {needsManualAmount(card) && (
          <div className="border-border mt-1 rounded-lg border bg-blue-500/10 px-3 py-2">
            <p className="text-sm font-semibold text-blue-300">Enter the amount manually</p>
            <p className="text-xs text-blue-200/80">The screenshot confirmed the code, but could not detect the amount for this card.</p>
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
                  <p className="mt-0.5 text-lg font-black text-amber-400">${card.evidence?.extractedAmount ?? '—'}</p>
                </div>
                <div className="rounded-lg border border-slate-500/15 bg-black/10 px-3 py-2">
                  <p className="text-[10px] font-semibold tracking-wide text-slate-300/70 uppercase">Incorrect Amount</p>
                  <p className="mt-0.5 text-lg font-black text-white">${card.amount || '—'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Button
                size="sm"
                onClick={() => resolveAmountMismatch(card.id, 'keep-declared')}
                className="h-8 bg-slate-500/20 px-3 text-xs font-bold text-slate-300 hover:bg-slate-500/30"
              >
                Keep typed amount
              </Button>
              <Button
                size="sm"
                onClick={() => resolveAmountMismatch(card.id, 'accept-extracted')}
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
                <p className="text-xl text-purple-200/80">The screenshot found a code very similar to the one you loaded.</p>
              </div>
              <div className="rounded-lg border border-purple-500/15 bg-black/10 px-3 py-2 md:min-w-[280px]">
                <p className="text-[10px] font-semibold tracking-wide text-purple-200/70 uppercase">Code in screenshot</p>
                <p className="mt-0.5 font-mono text-sm font-bold break-all text-purple-300">{card.evidence?.extractedCode ?? '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Button
                size="sm"
                onClick={() => confirmFuzzyMatch(card.id)}
                className="h-8 bg-purple-500/20 px-3 text-xs font-bold text-purple-400 hover:bg-purple-500/30"
              >
                Yes, it's the same code
              </Button>
              <Button
                size="sm"
                onClick={() => rejectFuzzyMatch(card.id)}
                className="h-8 bg-slate-500/20 px-3 text-xs font-bold text-slate-400 hover:bg-slate-500/30"
              >
                No, keep both codes
              </Button>
            </div>
          </div>
        )}

        {card.amount && card.claimCode && !isBlockingEvidenceState(status) && (
          <div className="bg-primary absolute top-1/2 -left-1 hidden h-8 w-1 -translate-y-1/2 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] md:block" />
        )}
      </motion.div>
    </div>
  );
}
