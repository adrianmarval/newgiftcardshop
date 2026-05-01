'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, Sparkles, Loader2, Upload, X, Plus, Code, ChevronDown, ChevronUp, ImageIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useSellFlow } from '@/hooks/use-sell-flow';
import { useAction } from 'next-safe-action/hooks';
import { uploadProvenanceImage, extractDraftBatch } from '@/actions/giftcard/ocr';
import { checkExistingCodes } from '@/actions/seller/check-codes';
import { parseClaimCodes, normalizeClaimCode } from '@/lib/utils/claim-code-parser';
import type { SellFlowImage } from '@/types/application/sell-flow';
import { showAlert } from '@/lib/swal';
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
  const {
    addImage,
    clearImages,
    setGiftcards,
    handleBulkImport,
    ingestOCRDraft,
    setStep,
    giftcards,
    selectedBrandCountry,
    brandCountryLimits,
  } = useSellFlow();

  const brandId = selectedBrandCountry?.split('|')[0] ?? '';
  const countryId = selectedBrandCountry?.split('|')[1] ?? '';

  const [pasteContent, setPasteContent] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [dbBlockedCodes, setDbBlockedCodes] = useState<string[]>([]);
  const [localImages, setLocalImages] = useState<Array<{ file: File; previewUrl: string }>>([]);
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [showFormatHelp, setShowFormatHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingDbCheckRef = useRef<(() => void) | null>(null);
  const pendingCodeToLineMapRef = useRef<Map<string, number>>(new Map());

  const isProcessing = stage !== 'idle' && stage !== 'done';
  const hasContent = pasteContent.trim().length > 0 || localImages.length > 0;

  // ── File handling ─────────────────────────────────────────────────────────

  const handleFilesSelected = useCallback(
    (files: FileList | File[]) => {
      const filesArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (filesArray.length === 0) {
        showAlert.toast.error('Select valid images');
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
        showAlert.toast.info('Selected images are already attached');
        return;
      }

      if (duplicateCount > 0) {
        showAlert.toast.info(`${duplicateCount} duplicate${duplicateCount !== 1 ? 's' : ''} skipped`);
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

  // ── DB check action ──────────────────────────────────────────────────────

  const { execute: runCheckExistingCodes } = useAction(checkExistingCodes, {
    onSuccess: ({ data }) => {
      if (data?.success && data.existingCodes && data.existingCodes.length > 0) {
        const codeToLineMap = pendingCodeToLineMapRef.current;
        const existingErrors = (data.existingCodes as string[]).map((code) => {
          const normalizedCode = code.replace(/[^A-Z0-9]/g, '').toUpperCase();
          const line = codeToLineMap.get(normalizedCode);
          if (line) {
            return `Line ${line}: Code ${code} already exists in inventory`;
          }
          return `Code ${code} already exists in inventory`;
        });
        setValidationErrors(existingErrors);
        setDbBlockedCodes(data.existingCodes as string[]);
        setStage('idle');
        return;
      }
      pendingDbCheckRef.current?.();
    },
    onError: ({ error }) => {
      console.error('[DB-CHECK] Error checking existing codes:', error.serverError);
      pendingDbCheckRef.current?.();
    },
  });

  // ── OCR extraction action ─────────────────────────────────────────────────

  const { execute: runExtraction } = useAction(extractDraftBatch, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setStage('ingesting');

        //Deduplicar: si hay mismo claimCode, preferir el que tiene monto
        const seen = new Map<string, (typeof data.cards)[0]>();
        for (const card of data.cards) {
          const key = card.claimCode?.toUpperCase().replace(/[^A-Z0-9]/g, '') ?? '';
          if (!key) continue;
          const existing = seen.get(key);
          if (!existing) {
            seen.set(key, card);
          } else {
            //Si ambos tienen monto, keep existing
            //Si existing no tiene monto pero card sí, replace
            if (!existing.amount && card.amount) {
              seen.set(key, card);
            }
          }
        }

        const deduped = Array.from(seen.values());
        console.log(`[AI-OCR-BATCH] Extraction: ${deduped.length} cards (after dedup)`);

        if (deduped.length > 0) {
          console.table(deduped.map((c) => ({ code: c.claimCode, amount: c.amount, confidence: c.ocrConfidence })));
        }

        //Solo vincular a las já criadas del texto - no criar novas tarjetas desde OCR
        //Las imágenes sin match se ignoran silenciosamente
        const onlyMatchExisting = deduped.filter((c) => {
          const normCode = c.claimCode?.toUpperCase().replace(/[^A-Z0-9]/g, '') ?? '';
          const existing = useSellFlow.getState().giftcards.filter((g) => g.claimCode.toUpperCase().replace(/[^A-Z0-9]/g, '') === normCode);
          return existing.length > 0;
        });

        ingestOCRDraft(onlyMatchExisting, []);

        if (onlyMatchExisting.length > 0) {
          showAlert.toast.success(`${onlyMatchExisting.length} card${onlyMatchExisting.length > 1 ? 's' : ''} linked from screenshots`);
        }

        // Phase 3.5: Check DB for existing codes (text codes only, not OCR)
        const textCodes = useSellFlow.getState().giftcards.map((g) => g.claimCode);
        console.log('[DB-CHECK] Checking text codes after OCR:', { textCodes, brandId, countryId });
        if (textCodes.length > 0) {
          pendingDbCheckRef.current = () => {
            setStage('done');
            setTimeout(() => setStep(3), 600);
          };
          pendingCodeToLineMapRef.current = new Map();
          runCheckExistingCodes({
            codes: textCodes,
            brandId: brandId,
            countryId: countryId,
          });
          return;
        }

        setStage('done');
        setTimeout(() => setStep(3), 600);
      } else if (data?.error) {
        console.error(`[AI-OCR-BATCH] Extraction logic error:`, data.error);
        showAlert.error('Extraction error', data.error);
        setStage('idle');
      }
    },
    onError: ({ error }) => {
      console.error(`[AI-OCR-BATCH] Server/Network error:`, error.serverError);
      showAlert.error('Extraction error', error.serverError || 'Could not read images');
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

  const proceedToImageUpload = useCallback(
    (filesToUpload: Array<{ file: File; previewUrl: string }>, parsedCount: number) => {
      if (filesToUpload.length > 0) {
        setStage('uploading');
        (async () => {
          let uploaded = 0;

          for (const localImg of filesToUpload) {
            try {
              console.log(`[UPLOAD] Uploading image ${localImg.file.name}...`);
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
                console.log(`[UPLOAD] Success for ${localImg.file.name} (ID: ${imageId})`);
              } else {
                console.error(`[UPLOAD] Failed for ${localImg.file.name}:`, result.data?.error);
                showAlert.error(`Error with ${localImg.file.name}`, result.data?.error || 'Upload failed');
              }
            } catch (error) {
              console.error(`[UPLOAD] Fatal error for ${localImg.file.name}:`, error);
              showAlert.error(`Error with ${localImg.file.name}`, 'Critical upload error');
            }
          }

          setLocalImages([]);

          if (uploaded > 0) {
            showAlert.toast.success(`${uploaded} screenshot${uploaded > 1 ? 's' : ''} uploaded`);
          }

          // Phase 3: Run OCR to associate images with existing text codes
          const storeImages = useSellFlow.getState().images;
          if (storeImages.length > 0) {
            setStage('extracting');
            runExtraction({
              images: storeImages.map((img) => ({ id: img.id, compressedData: img.compressedData })),
            });
          } else {
            // No images — go directly to review
            const allGiftcards = useSellFlow.getState().giftcards;
            if (parsedCount > 0 || allGiftcards.length > 0) {
              setStage('done');
              setTimeout(() => setStep(3), 400);
            } else {
              showAlert.toast.info('No cards to process');
              setStage('idle');
            }
          }
        })();
      } else {
        // No images — go directly to review
        const allGiftcards = useSellFlow.getState().giftcards;
        if (parsedCount > 0 || allGiftcards.length > 0) {
          setStage('done');
          setTimeout(() => setStep(3), 400);
        } else {
          showAlert.toast.info('No cards to process');
          setStage('idle');
        }
      }
    },
    [addImage, setStep, setLocalImages, setStage, runExtraction],
  );

  const handleProcessCards = async () => {
    if (!hasContent) {
      showAlert.toast.info('Paste codes or attach screenshots first');
      return;
    }

    setValidationErrors([]);

    // ── Phase 0: Wipe store for clean re-processing ──────────────────────
    const filesToUpload = [...localImages];

    setGiftcards([]);
    clearImages();

    // Phase 1: Parse text codes
    setStage('parsing');
    let parsedCount = 0;

    if (pasteContent.trim()) {
      let allErrors: string[] = [];
      const { parsed, errors, duplicates } = parseClaimCodes(pasteContent);

      if (errors.length > 0) {
        allErrors = [...errors];
      }

      if (duplicates.length > 0) {
        allErrors = [...allErrors, ...duplicates];
      }

      // Build code-to-line map before handleBulkImport clears the store
      const codeToLineMap = new Map<string, number>();
      const lines = pasteContent.split('\n');
      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        const candidateRe = /[A-Z0-9][A-Z0-9-]{13,17}[A-Z0-9]/gi;
        const match = trimmedLine.match(candidateRe);
        if (match) {
          const normalized = normalizeClaimCode(match[0]);
          if (normalized) {
            codeToLineMap.set(normalized, lineIdx + 1);
          }
        }
      }

      if (parsed.length > 0) {
        const result = handleBulkImport(parsed);
        parsedCount = result.importedCount;

        const allGiftcards = useSellFlow.getState().giftcards;
        const missingAmountErrors = allGiftcards
          .filter((g) => !g.amount || g.amount.trim() === '')
          .map((g) => `Line ${g.id}: Missing amount for claim code ${g.claimCode}`);

        if (missingAmountErrors.length > 0) {
          allErrors = [...allErrors, ...missingAmountErrors];
        }
      }

      if (allErrors.length > 0) {
        setValidationErrors(allErrors);
        setStage('idle');
        return;
      }

      // Phase 1.5: Check DB for existing codes BEFORE processing images
      const allCodes = useSellFlow.getState().giftcards.map((g) => g.claimCode);
      console.log('[DB-CHECK] Initiating check', { allCodes, brandId: brandId, countryId: countryId });
      if (allCodes.length > 0) {
        pendingDbCheckRef.current = () => proceedToImageUpload(filesToUpload, parsedCount);
        pendingCodeToLineMapRef.current = codeToLineMap;
        runCheckExistingCodes({
          codes: allCodes,
          brandId: brandId,
          countryId: countryId,
        });
        return;
      }
    }

    // No codes to check — proceed directly to image upload
    proceedToImageUpload(filesToUpload, parsedCount);
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
          'border-border bg-card/50 flex flex-1 flex-col gap-0 backdrop-blur-sm transition-all',
          isDragOver && 'border-primary bg-primary/5 scale-[1.01]',
        )}
      >
        {/* Header */}
        <CardHeader className="px-1">
          <CardTitle className="text-foreground text-lg font-bold md:text-2xl">Load Gift Cards</CardTitle>
          <CardDescription className="text-muted-foreground flex flex-col gap-1 text-xs md:block md:text-sm">
            Paste codes and attach screenshots — like composing an email.
            {/* Format help (collapsible) */}
            <Button
              type="button"
              onClick={() => setShowFormatHelp(!showFormatHelp)}
              className="text-muted-foreground hover:text-foreground text-md flex justify-start gap-1 transition-colors md:text-xs"
            >
              <Code className="h-3 w-3" />
              <span>Expected format</span>
              {showFormatHelp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {hasExistingCards && (
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary text-[10px] md:text-xs">
                {giftcards.length} card{giftcards.length !== 1 ? 's' : ''} loaded
              </Badge>
            )}
          </CardDescription>
        </CardHeader>

        {/* Textarea — the compose area */}
        <CardContent className="flex min-h-32 flex-1 flex-col space-y-1 p-1 md:min-h-48">
          <Textarea
            placeholder="Paste your gift card codes here…"
            value={pasteContent}
            onChange={(e) => {
              setPasteContent(e.target.value);
              if (validationErrors.length > 0 || dbBlockedCodes.length > 0) {
                setValidationErrors([]);
                setDbBlockedCodes([]);
              }
            }}
            disabled={isProcessing}
            className={cn(
              'border-border bg-muted/20 focus-visible:ring-primary text-md h-full w-full resize-none rounded-xl font-mono transition-all md:text-sm',
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
        </CardContent>

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
        <CardFooter className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-2">
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
        </CardFooter>
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
