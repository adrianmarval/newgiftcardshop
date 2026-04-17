'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, Sparkles, Loader2, Upload, X, Plus, Code, ChevronDown, ChevronUp, ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useSellFlow } from '@/hooks/use-sell-flow';
import { useAction } from 'next-safe-action/hooks';
import { uploadProvenanceImage, extractDraftBatch } from '@/actions/giftcard-validation-actions';
import { parseClaimCodes } from '@/lib/utils/claim-code-parser';
import type { SellFlowImage } from '@/types/flows/sell-flow';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Processing stage labels ────────────────────────────────────────────────

type ProcessingStage = 'idle' | 'parsing' | 'uploading' | 'extracting' | 'ingesting' | 'done';

const STAGE_LABELS: Record<ProcessingStage, string> = {
  idle: '',
  parsing: 'Parsing codes from text…',
  uploading: 'Uploading screenshots…',
  extracting: 'Analyzing screenshots with AI…',
  ingesting: 'Importing cards…',
  done: 'Done!',
};

const STAGE_PROGRESS: Record<ProcessingStage, number> = {
  idle: 0,
  parsing: 15,
  uploading: 35,
  extracting: 70,
  ingesting: 90,
  done: 100,
};

// ─── DataEntryStep ──────────────────────────────────────────────────────────

export function DataEntryStep() {
  const { addImage, clearImages, setGiftcards, handleBulkImport, ingestOCRDraft, setStep, giftcards } = useSellFlow();

  const [pasteContent, setPasteContent] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [localImages, setLocalImages] = useState<Array<{ file: File; previewUrl: string }>>([]);
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [showFormatHelp, setShowFormatHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isProcessing = stage !== 'idle' && stage !== 'done';
  const hasContent = pasteContent.trim().length > 0 || localImages.length > 0;

  // ── File handling ─────────────────────────────────────────────────────────

  const handleFilesSelected = useCallback(
    (files: FileList | File[]) => {
      const filesArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (filesArray.length === 0) {
        toast.error('Select valid images');
        return;
      }

      // Deduplication logic: check by name, size, and lastModified
      const uniqueFiles: File[] = [];
      let duplicateCount = 0;

      for (const f of filesArray) {
        const isDuplicate =
          localImages.some(
            (local) => local.file.name === f.name && local.file.size === f.size && local.file.lastModified === f.lastModified,
          ) || uniqueFiles.some((u) => u.name === f.name && u.size === f.size && u.lastModified === f.lastModified);

        if (isDuplicate) {
          duplicateCount++;
        } else {
          uniqueFiles.push(f);
        }
      }

      if (uniqueFiles.length === 0 && filesArray.length > 0) {
        toast.info('Selected images are already attached');
        return;
      }

      if (duplicateCount > 0) {
        toast.info(`${duplicateCount} duplicate${duplicateCount !== 1 ? 's' : ''} skipped`);
      }

      const newImages = uniqueFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      setLocalImages((prev) => [...prev, ...newImages]);
    },
    [localImages],
  );

  const removeLocalImage = useCallback((index: number) => {
    setLocalImages((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearLocalImages = useCallback(() => {
    setLocalImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      return [];
    });
  }, []);

  // ── OCR extraction action ─────────────────────────────────────────────────

  const { execute: runExtraction } = useAction(extractDraftBatch, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setStage('ingesting');
        console.log(
          `[AI-OCR-BATCH] Extraction successful. Found ${data.cards.length} cards and ${data.ignoredImages.length} empty images.`,
        );

        if (data.cards.length > 0) {
          console.table(
            data.cards.map((c) => ({
              code: c.claimCode,
              amount: c.amount,
              confidence: c.ocrConfidence,
            })),
          );
        }

        ingestOCRDraft(data.cards);
        const ignored = data.ignoredImages.length;
        if (ignored > 0) {
          toast.info(`${ignored} image${ignored > 1 ? 's' : ''} without readable code`, {
            description: "They won't be linked to any card.",
          });
        }
        if (data.cards.length > 0) {
          toast.success(`${data.cards.length} card${data.cards.length > 1 ? 's' : ''} extracted from screenshots`);
        }
        setStage('done');
        setTimeout(() => setStep(3), 600);
      } else if (data?.error) {
        console.error(`[AI-OCR-BATCH] Extraction logic error:`, data.error);
        toast.error('Extraction error', { description: data.error });
        setStage('idle');
      }
    },
    onError: ({ error }) => {
      console.error(`[AI-OCR-BATCH] Server/Network error:`, error.serverError);
      toast.error('Extraction error', { description: error.serverError || 'Could not read images' });
      setStage('idle');
    },
  });

  // ── Main processing pipeline ──────────────────────────────────────────────
  //
  // IMPORTANT: We clear ALL store state (giftcards + images) before each
  // processing run. This guarantees:
  //   - No stale evidence blocks correct amount_mismatch detection (Scenario 6)
  //   - No stale usedMatches prevents fuzzy matching (Scenario 4)
  //   - No image duplication from previous runs
  //
  // After uploading, localImages are cleared so they don't show as duplicates
  // of the newly-created store images.

  const handleProcessCards = async () => {
    if (!hasContent) {
      toast.info('Paste codes or attach screenshots first');
      return;
    }

    setValidationErrors([]);

    // ── Phase 0: Wipe store for clean re-processing ──────────────────────
    // Capture local files BEFORE clearing (they'll be uploaded fresh)
    const filesToUpload = [...localImages];

    setGiftcards([]);
    clearImages();

    // Phase 1: Parse text codes
    setStage('parsing');
    let parsedCount = 0;

    if (pasteContent.trim()) {
      const { parsed, errors, duplicateCount } = parseClaimCodes(pasteContent);

      if (errors.length > 0) {
        setValidationErrors(errors);
        // Hard block: user must fix ALL errors before proceeding
        toast.error('Formatting errors found', {
          description: 'Please correct or remove the highlighted lines before proceeding.',
        });
        setStage('idle');
        return;
      }

      if (parsed.length > 0) {
        const result = handleBulkImport(parsed);
        parsedCount = result.importedCount;

        if (result.duplicateCount > 0 || duplicateCount > 0) {
          const totalDupes = result.duplicateCount + duplicateCount;
          toast.info(`${totalDupes} duplicate${totalDupes !== 1 ? 's' : ''} skipped`);
        }
      }

      if (errors.length > 0 && parsed.length === 0) {
        toast.error('Could not parse any codes', {
          description: errors[0],
        });
        setStage('idle');
        return;
      }
    }

    // Phase 2: Upload screenshots (from localImages captured before clearing)
    if (filesToUpload.length > 0) {
      setStage('uploading');
      let uploaded = 0;

      for (const localImg of filesToUpload) {
        try {
          console.log(`[AI-OCR-BATCH] Uploading image ${localImg.file.name}...`);
          const result = await uploadProvenanceImage({ file: localImg.file });
          if (result.data?.success && result.data.compressedData) {
            const imageId = `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            const newImage: SellFlowImage = {
              id: imageId,
              compressedData: result.data.compressedData,
              previewUrl: localImg.previewUrl,
            };
            addImage(newImage);
            uploaded++;
            console.log(`[AI-OCR-BATCH] Upload success for ${localImg.file.name} (ID: ${imageId})`);
          } else {
            console.error(`[AI-OCR-BATCH] Upload failed for ${localImg.file.name}:`, result.data?.error);
            toast.error(`Error with ${localImg.file.name}`, {
              description: result.data?.error || 'Upload failed',
            });
          }
        } catch (error) {
          console.error(`[AI-OCR-BATCH] Fatal upload error for ${localImg.file.name}:`, error);
          toast.error(`Error with ${localImg.file.name}`);
        }
      }

      // Clear local previews — they're now in the store, no duplication
      setLocalImages([]);

      if (uploaded > 0) {
        toast.success(`${uploaded} screenshot${uploaded > 1 ? 's' : ''} uploaded`);
      }
    }

    // Phase 3: Run OCR extraction on all store images
    const storeImages = useSellFlow.getState().images;
    if (storeImages.length > 0) {
      setStage('extracting');
      try {
        console.log(`[PROCESS-START] Processing ${storeImages.length} images...`);
        const result = await extractDraftBatch({
          images: storeImages.map((img) => ({ id: img.id, compressedData: img.compressedData })),
        });

        if (result?.data?.success && result.data.cards) {
          console.log(`[PROCESS-RESULT] AI extraction complete. Found ${result.data.cards.length} potentials.`, result.data.cards);
          // Pass both successfully extracted cards and ignored images to the store
          ingestOCRDraft(result.data.cards, result.data.ignoredImages);
          setStep(3);
        } else if (result?.data?.error) {
          console.error('[PROCESS-ERROR] Extraction logic error:', result.data.error);
          toast.error('AI Processing error', { description: result.data.error });
        }
      } catch (error) {
        console.error('[PROCESS-ERROR] Fatal extraction error:', error);
        toast.error('AI Processing failed. Please try again.');
      } finally {
        setStage('done');
      }
    } else {
      // No images — go directly to review
      if (parsedCount > 0 || useSellFlow.getState().giftcards.length > 0) {
        setStage('done');
        setTimeout(() => setStep(3), 400);
      } else {
        toast.info('No cards to process');
        setStage('idle');
      }
    }
  };

  // ── Drag & Drop ───────────────────────────────────────────────────────────

  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFilesSelected(e.dataTransfer.files);
      }
    },
    [handleFilesSelected],
  );

  // ── Re-entry cleanup ───────────────────────────────────────────────────────
  // When DataEntryStep mounts (including re-entry from step 3), wipe store
  // state so the user starts with a clean compose box.
  useEffect(() => {
    setGiftcards([]);
    clearImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Thumbnail previews — only show localImages ────────────────────────────
  // Store images are an internal pipeline detail (compressed data for OCR).
  // The user-facing previews are the local file blobs they just attached.

  const allPreviews = localImages.map((img, idx) => ({
    id: `local-${idx}`,
    previewUrl: img.previewUrl,
    source: 'local' as const,
    localIndex: idx,
  }));
  const hasAttachments = allPreviews.length > 0;

  const hasExistingCards = giftcards.length > 0;

  return (
    <div className="flex h-full flex-col gap-2 md:gap-6" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {/* Main Compose Card */}
      <Card
        className={cn(
          'border-border bg-card/50 flex flex-1 flex-col gap-2 p-2 backdrop-blur-sm transition-all md:gap-4 md:p-6',
          isDragOver && 'border-primary bg-primary/5 scale-[1.01]',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-foreground text-lg font-bold md:text-2xl">Load Gift Cards</h2>
            <p className="text-muted-foreground hidden text-xs md:block md:text-sm">
              Paste codes and attach screenshots — like composing an email.
            </p>
          </div>
          {hasExistingCards && (
            <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary text-[10px] md:text-xs">
              {giftcards.length} card{giftcards.length !== 1 ? 's' : ''} loaded
            </Badge>
          )}
        </div>

        {/* Format help (collapsible) */}
        <button
          type="button"
          onClick={() => setShowFormatHelp(!showFormatHelp)}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[10px] transition-colors md:text-xs"
        >
          <Code className="h-3 w-3" />
          <span>Expected format</span>
          {showFormatHelp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        <AnimatePresence>
          {showFormatHelp && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="border-border bg-muted/30 space-y-1 rounded-lg border p-2 md:p-3">
                <p className="text-muted-foreground text-[10px] md:text-xs">
                  One card per line: <span className="text-foreground font-mono font-bold">CODE AMOUNT</span>
                </p>
                <div className="text-muted-foreground/70 font-mono text-[10px] md:text-xs">
                  <div>HPGE-JV9RR4-8SA9 30.00</div>
                  <div>XXBS-7W4HDV-D2AN 30.00</div>
                  <div>ZART-GWX7EB-ZVAR 5.60</div>
                </div>
                <p className="text-muted-foreground/50 text-[10px] italic">Amount is optional.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea — the compose area */}
        <div className="flex min-h-32 flex-1 flex-col gap-2 md:min-h-48">
          <Textarea
            placeholder="Paste your gift card codes here… (optional step)"
            value={pasteContent}
            onChange={(e) => {
              setPasteContent(e.target.value);
              if (validationErrors.length > 0) setValidationErrors([]);
            }}
            disabled={isProcessing}
            className={cn(
              'border-border bg-muted/20 focus-visible:ring-primary h-full w-full resize-none rounded-xl font-mono text-xs transition-all md:text-sm',
              isDragOver && 'border-primary',
              validationErrors.length > 0 && 'border-destructive/50 ring-destructive/20 ring-1',
            )}
          />

          <AnimatePresence>
            {validationErrors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="border-destructive/20 bg-destructive/5 rounded-xl border p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="bg-destructive h-1.5 w-1.5 animate-pulse rounded-full" />
                  <p className="text-destructive text-[10px] font-bold tracking-wider uppercase">Format Errors Detected</p>
                </div>
                <div className="custom-scrollbar max-h-32 space-y-1 overflow-y-auto pr-2">
                  {validationErrors.map((err, idx) => (
                    <div key={idx} className="flex gap-2 text-[10px] md:text-xs">
                      <span className="text-destructive/50 font-mono">•</span>
                      <p className="text-destructive/80 font-mono leading-relaxed">{err}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Attachments strip */}
        <AnimatePresence>
          {hasAttachments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="border-border bg-muted/20 rounded-lg border p-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase md:text-xs">
                    <ImageIcon className="h-3 w-3" />
                    {allPreviews.length} screenshot{allPreviews.length !== 1 ? 's' : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      clearLocalImages();
                    }}
                    disabled={isProcessing}
                    className="text-muted-foreground hover:text-destructive h-6 px-2 text-[10px]"
                  >
                    Clear all
                  </Button>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  <AnimatePresence>
                    {allPreviews.map((preview) => (
                      <motion.div
                        key={preview.id}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border md:h-20 md:w-20"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview.previewUrl} alt="Screenshot" className="h-full w-full object-cover" />
                        {!isProcessing && (
                          <button
                            type="button"
                            onClick={() => removeLocalImage(preview.localIndex)}
                            className="bg-destructive text-destructive-foreground absolute top-0.5 right-0.5 rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Add more button */}
                  {!isProcessing && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="hover:bg-muted text-muted-foreground flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed transition-colors md:h-20 md:w-20"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-[9px]">Add</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing progress */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="border-primary/20 bg-primary/5 space-y-2 rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="text-primary flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{STAGE_LABELS[stage]}</span>
                  </div>
                  <span className="text-primary font-semibold">{STAGE_PROGRESS[stage]}%</span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <motion.div
                    className="bg-primary h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${STAGE_PROGRESS[stage]}%` }}
                    transition={{ ease: 'easeOut', duration: 0.35 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action bar */}
        <div className="border-border mt-auto grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t pt-2 md:pt-3">
          <Button
            onClick={() => setStep(1)}
            variant="outline"
            size="sm"
            disabled={isProcessing}
            className="h-8 text-xs font-bold md:h-10 md:text-sm"
          >
            Back
          </Button>

          {/* Attach button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="border-primary/20 bg-primary/5 hover:bg-primary/10 h-8 gap-1.5 text-xs md:h-10 md:text-sm"
          >
            <Paperclip className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Attach Screenshots</span>
            <span className="md:hidden">Attach</span>
          </Button>

          {/* Process button */}
          <Button
            onClick={handleProcessCards}
            disabled={isProcessing || !hasContent}
            size="sm"
            className="bg-primary text-primary-foreground h-8 text-xs font-bold md:h-10 md:text-sm"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Process Cards
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFilesSelected(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <div className="border-primary bg-card flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8">
              <Upload className="text-primary h-12 w-12" />
              <p className="text-foreground text-lg font-bold">Drop screenshots here</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
