'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  MinusCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Loader2,
  X,
  Plus,
  Trash2,
  Camera,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useSellFlow } from '@/hooks/use-sell-flow';
import { useAction } from 'next-safe-action/hooks';
import { uploadProvenanceImage, validateGiftCardImages } from '@/actions/giftcard-validation-actions';
import type { ProofUploadStepProps } from '../types';
import type { ValidationResult, ValidationState, ImageExtractionResult } from '@/types/sell/validation';
import { isBlockingEvidenceState } from '@/types/sell/validation';
import type { SellFlowImage } from '@/types';
import { toast } from 'sonner';

// ─── Validation State Display Config ─────────────────────────────────────────

const VALIDATION_STATE_CONFIG: Record<
  ValidationState,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  verified: { label: 'Verificado', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  amount_mismatch: { label: 'Monto diferente', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: AlertCircle },
  code_new_detected: { label: 'Código nuevo', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: HelpCircle },
  /** no_capture: evidence absent — non-blocking, neutral styling */
  no_capture: { label: 'Sin captura (opcional)', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: ImageIcon },
  capture_mismatch: { label: 'Captura incorrecta', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: AlertCircle },
  processing_error: { label: 'Error', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: RefreshCw },
  fuzzy_match: { label: 'Coincidencia parcial', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: HelpCircle },
  /** skipped: seller explicitly opted out of evidence — non-blocking, neutral styling */
  skipped: { label: 'Sin captura (opcional)', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: MinusCircle },
};

// ─── Main ProofUploadStep Component ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Props accepted for API compatibility; component reads from useSellFlow hook
export function ProofUploadStep(_props: ProofUploadStepProps) {
  const {
    giftcards,
    images,
    setStep,
    setCardValidationResult,
    skipCardEvidence,
    addImage,
    removeImage,
    clearImages,
    removeGiftcard,
    confirmFuzzyMatch,
    resolveAmountMismatch,
    setUnmatchedImages: storeSetUnmatchedImages,
  } = useSellFlow();
  const [phase, setPhase] = useState<'upload' | 'validate'>('upload');
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [localUnmatchedImages, setLocalUnmatchedImages] = useState<ImageExtractionResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [replacingCardId, setReplacingCardId] = useState<string | null>(null);
  // Tracks the card being replaced across the async validation round-trip so the
  // onSuccess callback can apply capture_mismatch post-processing.
  const pendingReplaceRef = useRef<{ cardId: string; imageId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // ─── Image Upload ──────────────────────────────────────────────────────────

  const handleFilesUpload = async (files: FileList | File[]) => {
    const filesArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (filesArray.length === 0) {
      toast.error('Seleccioná imágenes válidas');
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
      toast.success(`${uploaded} imagen${uploaded > 1 ? 'es' : ''} subida${uploaded > 1 ? 's' : ''}`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFilesUpload(e.dataTransfer.files);
  };

  // ─── Validate All ──────────────────────────────────────────────────────────

  const { execute: validateImages } = useAction(validateGiftCardImages, {
    onExecute: () => setIsValidating(true),
    onSuccess: ({ data }) => {
      setIsValidating(false);
      if (data?.success) {
        // Store validation results + image association in Zustand
        data.results.forEach((result) => {
          setCardValidationResult(result.cardId, result.state, result.extractedCode, result.extractedAmount, result.matchedImageId);
        });
        setValidationResults(data.results);
        setLocalUnmatchedImages(data.unmatchedImages);
        // Also persist unmatched images to the store for review step display
        storeSetUnmatchedImages(
          data.unmatchedImages.map((img) => ({
            imageId: img.imageId,
            extractedCode: img.extractedCode,
            extractedAmount: img.extractedAmount,
          })),
        );
        setPhase('validate');

        // Post-process replacement: if the replaced card is still unresolved (no_capture)
        // and the new image appears in unmatchedImages, classify it as capture_mismatch.
        const pending = pendingReplaceRef.current;
        if (pending) {
          pendingReplaceRef.current = null;
          const replacedResult = data.results.find((r) => r.cardId === pending.cardId);
          const isStillUnresolved = !replacedResult || replacedResult.state === 'no_capture';
          const isUnmatched = data.unmatchedImages.some((img) => img.imageId === pending.imageId);
          if (isStillUnresolved && isUnmatched) {
            setCardValidationResult(pending.cardId, 'capture_mismatch', undefined, undefined, undefined);
          }
        }
      } else if (data?.error) {
        toast.error('Error en validación', { description: data.error });
      }
    },
    onError: ({ error }) => {
      setIsValidating(false);
      pendingReplaceRef.current = null;
      toast.error('Error en validación', { description: error.serverError || 'Error al validar imágenes' });
    },
  });

  /**
   * Marks every card as `skipped` (non-blocking optional evidence) and jumps
   * directly to the validate phase without calling the AI validation action.
   * Used by the "Continuar sin capturas" fast-path.
   */
  const skipAllCards = useCallback(() => {
    giftcards.forEach((card) => skipCardEvidence(card.id));
    setPhase('validate');
  }, [giftcards, skipCardEvidence]);

  const handleValidateAll = () => {
    // If no images were uploaded, skip directly to validate phase marking all cards as skipped
    if (images.length === 0) {
      skipAllCards();
      return;
    }
    validateImages({
      cards: giftcards.map((g) => ({ id: g.id, claimCode: g.claimCode, amount: g.amount })),
      images: images.map((img) => ({ id: img.id, compressedData: img.compressedData })),
    });
  };

  const handleRetryFailed = () => {
    const failedCards = validationResults.filter((r) => r.state === 'processing_error');
    const failedImageIds = failedCards.map((r) => r.matchedImageId).filter((id): id is string => !!id);
    const cardsToRetry = giftcards.filter((g) => failedCards.some((r) => r.cardId === g.id));
    const imagesToRetry = images.filter((img) => failedImageIds.includes(img.id));

    if (imagesToRetry.length > 0) {
      validateImages({
        cards: cardsToRetry.map((g) => ({ id: g.id, claimCode: g.claimCode, amount: g.amount })),
        images: imagesToRetry.map((img) => ({ id: img.id, compressedData: img.compressedData })),
      });
    }
  };

  // ─── Removal Handler ───────────────────────────────────────────────────────

  const handleRemoveFromBatch = useCallback(
    (cardId: string) => {
      removeGiftcard(cardId);
      setValidationResults((prev) => prev.filter((r) => r.cardId !== cardId));
    },
    [removeGiftcard],
  );

  const handleReplaceCapture = useCallback((cardId: string) => {
    setReplacingCardId(cardId);
    replaceInputRef.current?.click();
  }, []);

  const handleReplaceCaptureFile = useCallback(
    async (file: File) => {
      if (!replacingCardId) return;
      const cardId = replacingCardId;
      setReplacingCardId(null);

      // Find the current card to get its matched image
      const card = giftcards.find((g) => g.id === cardId);
      if (card?.matchedImageId) {
        removeImage(card.matchedImageId);
      }

      // Clear the card's validation fields
      setCardValidationResult(cardId, 'no_capture', undefined, undefined, undefined);

      try {
        const result = await uploadProvenanceImage({ file });
        if (!result.data?.success || !result.data.compressedData) {
          toast.error(`Error al subir imagen`, { description: result.data?.error || 'Error al subir' });
          return;
        }

        const imageId = `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const newImage: SellFlowImage = {
          id: imageId,
          compressedData: result.data.compressedData,
          previewUrl: URL.createObjectURL(file),
        };
        addImage(newImage);

        // Record the pending replacement so onSuccess can apply capture_mismatch if needed.
        pendingReplaceRef.current = { cardId, imageId };

        // Re-validate the full batch with the updated image set
        // We use the store's current giftcards/images snapshots; addImage is synchronous
        // so we build the image list manually to avoid stale closure.
        const currentImages = [...images.filter((img) => img.id !== card?.matchedImageId), newImage];
        validateImages({
          cards: giftcards.map((g) => ({ id: g.id, claimCode: g.claimCode, amount: g.amount })),
          images: currentImages.map((img) => ({ id: img.id, compressedData: img.compressedData })),
        });
      } catch {
        toast.error('Error al reemplazar captura');
      }
    },
    [replacingCardId, giftcards, images, removeImage, setCardValidationResult, addImage, validateImages],
  );

  const handleProceed = () => setStep(4);

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const resultsMap = new Map(validationResults.map((r) => [r.cardId, r]));
  // verifiedCount / failedCount reflect the initial server result for the summary counters.
  const verifiedCount = validationResults.filter((r) => r.state === 'verified').length;
  const failedCount = validationResults.filter((r) => r.state === 'processing_error').length;

  // skippedCount: cards without evidence (no_capture or skipped) — non-blocking.
  const skippedCount = giftcards.filter((card) => {
    const status = card.evidence?.status ?? card.validationState;
    return status === 'skipped' || status === 'no_capture';
  }).length;

  /**
   * canProceed: true when every card is in a non-blocking evidence state.
   * Evidence-absent states (`no_capture`, `skipped`, or undefined) do NOT block.
   * Blocking states: amount_mismatch, capture_mismatch, processing_error, fuzzy_match.
   *
   * Uses evidence.status (new) with fallback to validationState (legacy) so that
   * corrective actions (resolveAmountMismatch, confirmFuzzyMatch) are reflected immediately.
   */
  const canProceed =
    giftcards.length > 0 &&
    giftcards.every((card) => {
      const status = card.evidence?.status ?? card.validationState;
      return !isBlockingEvidenceState(status);
    });

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="grid h-full grid-cols-1 items-start gap-4 pb-20 md:grid-cols-12 md:gap-6 md:pb-0">
      {/* Hidden input for single-file capture replacement */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleReplaceCaptureFile(file);
          e.target.value = '';
        }}
      />

      {/* Floating Upload Button (Mobile) */}
      {phase === 'upload' && (
        <div className="fixed right-6 bottom-6 z-50 md:hidden">
          <Button
            onClick={() => fileInputRef.current?.click()}
            size="icon"
            className="border-primary/20 bg-primary text-primary-foreground shadow-primary/40 hover:bg-primary/90 h-14 w-14 rounded-full border-2 shadow-xl"
          >
            <Plus className="h-7 w-7" />
          </Button>
        </div>
      )}

      {/* Left Column: Summary & Navigation */}
      <Card className="border-border bg-card/50 sticky top-0 z-20 space-y-4 p-3 backdrop-blur-sm md:col-span-3 md:space-y-6 md:p-6">
        <div>
          <h2 className="text-foreground mb-0.5 text-xl font-bold md:mb-1 md:text-2xl">Emparejar Capturas</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Subí capturas de pantalla para emparejar con cada claim code. Las capturas son opcionales.
          </p>
        </div>

        <div className="space-y-3 border-t border-slate-800 pt-4 md:pt-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tarjetas</span>
              <span className="text-foreground font-bold">{giftcards.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Imágenes</span>
              <span className="text-foreground font-bold">{images.length}</span>
            </div>
            {phase === 'validate' && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Verificadas</span>
                  <span className="font-bold text-emerald-400">{verifiedCount}</span>
                </div>
                {failedCount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Errores</span>
                    <span className="font-bold text-red-400">{failedCount}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="border-t border-slate-800 pt-3 md:pt-4">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  phase === 'upload'
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                }
              >
                {phase === 'upload' ? 'Subida' : 'Validado'}
              </Badge>
            </div>
          </div>

          {/* Navigation */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => setStep(2)}
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:bg-muted h-10 text-sm md:h-11 md:text-base"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Volver
            </Button>
            {phase === 'upload' ? (
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleValidateAll}
                  disabled={isUploading}
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 text-sm md:h-11 md:text-base"
                >
                  {isValidating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                  {images.length === 0 ? 'Continuar sin capturas' : 'Validar'}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                {failedCount > 0 && (
                  <Button
                    onClick={handleRetryFailed}
                    variant="outline"
                    size="sm"
                    className="border-border h-10 text-xs font-bold text-amber-400 hover:bg-amber-500/10 md:h-11"
                  >
                    <RefreshCw className="mr-1 h-3 w-3" /> Reintentar
                  </Button>
                )}
                <Button
                  onClick={handleProceed}
                  disabled={!canProceed}
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 text-sm md:h-11 md:text-base"
                >
                  Continuar <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Right Column: Main Content */}
      <Card className="border-border bg-card/50 flex min-h-100 flex-col p-3 backdrop-blur-sm md:col-span-9 md:min-h-125 md:p-6">
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <Label className="text-muted-foreground text-sm font-semibold tracking-wider uppercase md:text-sm">
            {phase === 'upload' ? 'Capturas de Imágenes' : 'Resultados de Validación'}
          </Label>
          {isValidating && (
            <div className="text-primary flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando con IA...
            </div>
          )}
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto pr-1 md:pr-2">
          <AnimatePresence mode="wait">
            {phase === 'upload' ? (
              <motion.div
                key="upload-phase"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Dropzone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-border bg-muted/20 hover:bg-muted/30 cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                    dragActive ? 'border-primary bg-primary/5 scale-[1.02]' : ''
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) handleFilesUpload(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <Upload className={`mx-auto mb-2 h-8 w-8 ${dragActive ? 'text-primary' : 'text-muted-foreground/50'}`} />
                  <p className="text-foreground mb-1 text-sm font-semibold">Arrastrá las capturas o hacé clic acá</p>
                  <p className="text-muted-foreground text-xs">
                    La IA leerá los claim codes y emparejará cada captura con tu tarjeta automáticamente. Las capturas son opcionales.
                  </p>
                </div>

                {/* Image Thumbnails Grid */}
                {images.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                        Imágenes subidas ({images.length})
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearImages}
                        className="text-muted-foreground hover:text-destructive h-7 text-xs"
                      >
                        Limpiar todo
                      </Button>
                    </div>
                    <div className="grid max-h-[400px] grid-cols-3 gap-2 overflow-y-auto pb-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                      <AnimatePresence>
                        {images.map((img) => (
                          <motion.div
                            key={img.id}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="group border-border bg-background relative aspect-square overflow-hidden rounded-lg border"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- previewUrl is a local blob: URL (URL.createObjectURL); next/image does not support blob: URLs */}
                            <img src={img.previewUrl} alt="Captura" className="h-full w-full object-cover" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImage(img.id);
                              }}
                              className="bg-destructive text-destructive-foreground absolute top-1 right-1 rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {/* Add more button */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="hover:bg-muted text-muted-foreground flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="text-[10px]">Sumar</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Progress */}
                {isUploading && (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Subiendo imágenes...
                  </div>
                )}

                {/* Card list preview — shows which cards need images */}
                <div>
                  <Label className="text-muted-foreground mb-2 block text-xs font-semibold tracking-wider uppercase">
                    Claim codes a emparejar ({giftcards.length})
                  </Label>
                  <div className="space-y-2">
                    {giftcards.map((card, idx) => (
                      <div
                        key={card.id}
                        className="border-border bg-muted/20 flex items-center justify-between rounded-lg border px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs font-black">#{idx + 1}</span>
                          <span className="text-foreground text-sm font-bold">${card.amount || '—'}</span>
                          <span className="text-muted-foreground font-mono text-xs">{card.claimCode || 'Sin código'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="validate-phase"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-3"
              >
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-2">
                  <Card className="border-border bg-card/50 p-2 text-center md:p-3">
                    <p className="text-muted-foreground text-[10px] tracking-wider uppercase md:text-xs">Verificadas</p>
                    <p className="text-xl font-black text-emerald-400 md:text-2xl">{verifiedCount}</p>
                  </Card>
                  <Card className="border-border bg-card/50 p-2 text-center md:p-3">
                    <p className="text-muted-foreground text-[10px] tracking-wider uppercase md:text-xs">Sin captura</p>
                    <p className="text-xl font-black text-slate-400 md:text-2xl">{skippedCount}</p>
                  </Card>
                  <Card className="border-border bg-card/50 p-2 text-center md:p-3">
                    <p className="text-muted-foreground text-[10px] tracking-wider uppercase md:text-xs">Total</p>
                    <p className="text-foreground text-xl font-black md:text-2xl">{giftcards.length}</p>
                  </Card>
                  <Card className="border-border bg-card/50 p-2 text-center md:p-3">
                    <p className="text-muted-foreground text-[10px] tracking-wider uppercase md:text-xs">Errores</p>
                    <p className="text-xl font-black text-red-400 md:text-2xl">{failedCount}</p>
                  </Card>
                </div>

                {/* Validation Results */}
                {giftcards.map((card, idx) => {
                  const result = resultsMap.get(card.id);
                  // Use evidence.status (new canonical field) as primary display truth.
                  // Fall back to legacy validationState, then local result state, then 'no_capture'.
                  // This ensures that correction actions (resolveAmountMismatch, confirmFuzzyMatch)
                  // applied via the store reflect immediately in the display — regardless of whether
                  // local validationResults is populated (e.g. after back-navigation remount).
                  const state: ValidationState = card.evidence?.status ?? card.validationState ?? result?.state ?? 'no_capture';
                  const config = VALIDATION_STATE_CONFIG[state];
                  const Icon = config.icon;
                  // Find preview URL for matched image — use evidence.matchedImageId with legacy fallback
                  const matchedImageId = card.evidence?.matchedImageId ?? card.matchedImageId;
                  const matchedImage = matchedImageId ? images.find((img) => img.id === matchedImageId) : null;

                  return (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="border-border bg-muted/20 rounded-xl border p-3 md:p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {/* Thumbnail or number */}
                          {matchedImage ? (
                            // eslint-disable-next-line @next/next/no-img-element -- previewUrl is a local blob: URL (URL.createObjectURL); next/image does not support blob: URLs
                            <img
                              src={matchedImage.previewUrl}
                              alt="Captura"
                              className="border-border h-8 w-8 rounded-md border object-cover"
                            />
                          ) : (
                            <div className="bg-primary/20 text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-black">
                              {idx + 1}
                            </div>
                          )}
                          <div>
                            <p className="text-foreground text-sm font-bold">${card.amount || '—'}</p>
                            <p className="text-muted-foreground font-mono text-xs">{card.claimCode || 'Sin código'}</p>
                          </div>
                        </div>
                        <Badge className={`${config.color} text-xs`}>
                          <Icon className="mr-1 h-3 w-3" />
                          {config.label}
                        </Badge>
                      </div>

                      {/* State-specific actions */}
                      <AnimatePresence mode="wait">
                        {state === 'amount_mismatch' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-border space-y-2 rounded-lg border bg-amber-500/10 p-2 md:p-3"
                          >
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Detectado:</span>
                              {/* Use evidence.extractedAmount (new) with fallback to local result */}
                              <span className="font-bold text-amber-400">
                                ${card.evidence?.extractedAmount ?? result?.extractedAmount ?? '—'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Ingresado:</span>
                              <span className="text-foreground font-bold">${card.amount}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <Button
                                size="sm"
                                onClick={() => resolveAmountMismatch(card.id, 'keep-declared')}
                                className="h-8 bg-slate-500/20 text-xs font-bold text-slate-300 hover:bg-slate-500/30"
                              >
                                Declarado
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => resolveAmountMismatch(card.id, 'accept-extracted')}
                                className="h-8 bg-amber-500/20 text-xs font-bold text-amber-400 hover:bg-amber-500/30"
                              >
                                Extraído
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => resolveAmountMismatch(card.id, 'remove')}
                                className="h-8 bg-red-500/20 text-xs font-bold text-red-400 hover:bg-red-500/30"
                              >
                                Eliminar
                              </Button>
                            </div>
                          </motion.div>
                        )}

                        {state === 'fuzzy_match' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-border space-y-2 rounded-lg border bg-purple-500/10 p-2 md:p-3"
                          >
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">La imagen muestra:</span>
                              {/* Use evidence.extractedCode (new) with fallback to local result — always populated after back-nav */}
                              <span className="font-mono font-bold text-purple-400">
                                {card.evidence?.extractedCode ?? result?.extractedCode ?? '—'}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => confirmFuzzyMatch(card.id)}
                                className="h-8 flex-1 bg-purple-500/20 text-xs font-bold text-purple-400 hover:bg-purple-500/30"
                              >
                                Confirmar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setCardValidationResult(card.id, 'skipped')}
                                className="h-8 flex-1 bg-slate-500/20 text-xs font-bold text-slate-400 hover:bg-slate-500/30"
                              >
                                Rechazar
                              </Button>
                            </div>
                          </motion.div>
                        )}

                        {state === 'no_capture' && phase === 'validate' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-border flex flex-wrap gap-2 rounded-lg border bg-slate-500/10 p-2 md:p-3"
                          >
                            <Button
                              size="sm"
                              onClick={() => handleReplaceCapture(card.id)}
                              disabled={replacingCardId === card.id}
                              className="h-8 flex-1 bg-slate-500/20 text-xs font-bold text-slate-400 hover:bg-slate-500/30"
                            >
                              {replacingCardId === card.id ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Camera className="mr-1 h-3 w-3" />
                              )}
                              Agregar captura
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => skipCardEvidence(card.id)}
                              className="h-8 flex-1 bg-slate-500/20 text-xs font-bold text-slate-400 hover:bg-slate-500/30"
                            >
                              <MinusCircle className="mr-1 h-3 w-3" />
                              Sin captura
                            </Button>
                            {giftcards.length > 1 && (
                              <Button
                                size="sm"
                                onClick={() => handleRemoveFromBatch(card.id)}
                                className="h-8 flex-1 bg-slate-500/20 text-xs font-bold text-slate-400 hover:bg-slate-500/30"
                              >
                                <Trash2 className="mr-1 h-3 w-3" />
                                Quitar del lote
                              </Button>
                            )}
                          </motion.div>
                        )}

                        {state === 'skipped' && phase === 'validate' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-border flex gap-2 rounded-lg border bg-slate-500/10 p-2 md:p-3"
                          >
                            <Button
                              size="sm"
                              onClick={() => handleReplaceCapture(card.id)}
                              disabled={replacingCardId === card.id}
                              className="h-8 flex-1 bg-slate-500/20 text-xs font-bold text-slate-400 hover:bg-slate-500/30"
                            >
                              {replacingCardId === card.id ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Camera className="mr-1 h-3 w-3" />
                              )}
                              Agregar captura (opcional)
                            </Button>
                          </motion.div>
                        )}

                        {state === 'capture_mismatch' && phase === 'validate' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-border space-y-2 rounded-lg border bg-orange-500/10 p-2 md:p-3"
                          >
                            <p className="text-xs font-semibold text-orange-400">La captura no corresponde a este claim code</p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleReplaceCapture(card.id)}
                                disabled={replacingCardId === card.id}
                                className="h-8 flex-1 bg-orange-500/20 text-xs font-bold text-orange-400 hover:bg-orange-500/30"
                              >
                                {replacingCardId === card.id ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                  <Camera className="mr-1 h-3 w-3" />
                                )}
                                Reemplazar captura
                              </Button>
                              {giftcards.length > 1 && (
                                <Button
                                  size="sm"
                                  onClick={() => handleRemoveFromBatch(card.id)}
                                  className="h-8 flex-1 bg-slate-500/20 text-xs font-bold text-slate-400 hover:bg-slate-500/30"
                                >
                                  <Trash2 className="mr-1 h-3 w-3" />
                                  Quitar del lote
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}

                {/* Unmatched Images — informational only, never blocks publishing */}
                {localUnmatchedImages.length > 0 && (
                  <div className="mt-4 border-t border-slate-800 pt-4">
                    <Label className="text-muted-foreground mb-2 block text-xs font-semibold tracking-wider uppercase">
                      Capturas sin asignar (informativo — no bloquea)
                    </Label>
                    <div className="space-y-2">
                      {localUnmatchedImages.map((img) => (
                        <div
                          key={img.imageId}
                          className="flex items-center justify-between rounded-lg border border-slate-500/30 bg-slate-500/5 p-3"
                        >
                          <div>
                            <p className="font-mono text-sm font-bold text-slate-400">{img.extractedCode || 'Código ilegible'}</p>
                            {img.extractedAmount && <p className="text-muted-foreground text-xs">${img.extractedAmount}</p>}
                          </div>
                          <Badge className="border-slate-500/30 bg-slate-500/20 text-xs text-slate-400">Sin asignar</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
