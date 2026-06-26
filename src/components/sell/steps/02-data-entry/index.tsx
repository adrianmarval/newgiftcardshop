'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, Sparkles, Loader2, Code, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useSellFlow } from '@/hooks/use-sell-flow';
import { useDataEntryPipeline } from '@/hooks/use-data-entry-pipeline';
import { FileDropZone } from './file-drop-zone';
import { ProcessingProgress } from './processing-progress';
import { cn } from '@/lib/ui';
import { SellStepsProgress } from '../shared/sell-steps-progress';

// ─── DataEntryStep ──────────────────────────────────────────────────────────

export function DataEntryStep() {
  const { giftcards, setStep } = useSellFlow();

  const [pasteContent, setPasteContent] = useState('');
  const [localImages, setLocalImages] = useState<Array<{ file: File; previewUrl: string }>>([]);
  const [showFormatHelp, setShowFormatHelp] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  const {
    stage,
    validationErrors,
    setValidationErrors,
    dbBlockedCodes,
    setDbBlockedCodes,
    isProcessing,
    hasContent,
    handleProcessCards,
    handleFilesSelected,
    removeLocalImage,
    clearLocalImages,
    fileInputRef,
  } = useDataEntryPipeline({
    pasteContent,
    localImages,
    setLocalImages,
    setStep,
  });

  const hasExistingCards = giftcards.length > 0;

  // ── Drag & Drop ───────────────────────────────────────────────────────────

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

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-1"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <SellStepsProgress />

      <Card
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-0 border py-0 backdrop-blur-sm transition-all',
          isDragOver && 'border-primary bg-primary/5 scale-[1.01]',
        )}
      >
        {/* Header */}
        <CardHeader className="shrink-0 px-3 pt-2 md:px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground text-md font-bold md:text-xl">
              Load Gift Cards
            </CardTitle>
            {hasExistingCards && (
              <Badge
                variant="outline"
                className="border-primary/20 bg-primary/10 text-primary text-[10px] md:text-xs"
              >
                {giftcards.length} card{giftcards.length !== 1 ? 's' : ''} loaded
              </Badge>
            )}
          </div>
          <CardDescription className="text-muted-foreground mt-1 flex flex-col gap-1 text-xs md:text-sm">
            Paste codes and attach screenshots (optional)
            <Button
              type="button"
              variant="link"
              onClick={() => setShowFormatHelp(!showFormatHelp)}
              className="text-muted-foreground hover:text-foreground flex h-auto w-auto justify-start gap-1 p-0 text-[11px] font-medium transition-colors md:text-xs"
            >
              <Code className="h-3 w-3" />
              <span>Expected ClaimCode Format</span>
              {showFormatHelp ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
            <AnimatePresence>
              {showFormatHelp && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-1 overflow-hidden"
                >
                  <div className="border-border bg-muted/30 space-y-1 rounded-lg border p-2 md:p-3">
                    <p className="text-muted-foreground text-[12px] md:text-xs">
                      One card per line:{' '}
                      <span className="text-foreground font-mono font-bold">
                        CODE AMOUNT
                      </span>
                    </p>
                    <div className="text-muted-foreground/70 font-mono text-[12px] md:text-xs">
                      <div>HPGE-JV9RR4-8SA9 30.00</div>
                      <div>XXBS-7W4HDV-D2AN 30.00</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardDescription>
        </CardHeader>

        {/* Textarea + Errors */}
        <CardContent className="flex min-h-0 flex-1 flex-col space-y-1 p-2">
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
              'border-border bg-muted/20 focus-visible:ring-primary h-full w-full flex-1 resize-none rounded-xl p-3 font-mono text-sm transition-all md:text-sm',
              isDragOver && 'border-primary',
              validationErrors.length > 0 &&
                'border-destructive/50 ring-destructive/20 ring-1',
            )}
          />

          {/* Error box */}
          <AnimatePresence>
            {validationErrors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="border-destructive/20 bg-destructive/5 shrink-0 rounded-xl border p-3"
              >
                <div className="mb-1.5 flex items-center gap-1">
                  <div className="bg-destructive h-1.5 w-1.5 animate-pulse rounded-full" />
                  <p className="text-destructive text-[10px] font-bold tracking-wider uppercase">
                    Format Errors Detected
                  </p>
                </div>
                <div className="custom-scrollbar max-h-24 space-y-1 overflow-y-auto pr-2 md:max-h-32">
                  {validationErrors.map((err, idx) => (
                    <div key={idx} className="flex gap-1 text-[11px] md:text-xs">
                      <span className="text-destructive/50 font-mono">•</span>
                      <p className="text-destructive/80 font-mono leading-relaxed">
                        {err}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>

        {/* File previews + processing progress */}
        <FileDropZone
          ref={fileInputRef}
          localImages={localImages}
          isProcessing={isProcessing}
          isDragOver={isDragOver}
          onFilesSelected={handleFilesSelected}
          onRemoveImage={removeLocalImage}
          onClearImages={clearLocalImages}
        />

        <ProcessingProgress stage={stage} />
      </Card>

      {/* Action bar */}
      <div className="flex items-center justify-center-safe gap-1">
        <Button
          onClick={() => setStep(1)}
          variant="outline"
          size="sm"
          disabled={isProcessing}
          className="h-9 text-xs font-bold md:h-10 md:text-sm"
        >
          Back
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="border-primary/20 bg-primary/5 hover:bg-primary/10 h-9 gap-1.5 text-xs md:h-10 md:text-sm"
        >
          <Paperclip className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Attach Screenshots</span>
          <span className="md:hidden">Attach</span>
        </Button>

        <Button
          onClick={handleProcessCards}
          disabled={isProcessing || !hasContent}
          size="sm"
          className="bg-primary text-primary-foreground h-9 text-xs font-bold md:h-10 md:text-sm"
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
    </div>
  );
}
