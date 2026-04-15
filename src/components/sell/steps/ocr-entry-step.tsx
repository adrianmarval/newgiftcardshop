'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2, X, Plus, Trash2, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Camera, HelpCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSellFlow } from '@/hooks/use-sell-flow';
import { useAction } from 'next-safe-action/hooks';
import { uploadProvenanceImage, extractDraftBatch } from '@/actions/giftcard-validation-actions';
import type { SellFlowImage } from '@/types/flows/sell-flow';
import { isBlockingEvidenceState } from '@/types/sell/validation';
import { toast } from 'sonner';

// ─── Phase types ─────────────────────────────────────────────────────────────

type Phase = 'upload' | 'review';

// ─── OcrEntryStep ─────────────────────────────────────────────────────────────

/**
 * OCR-first entry step.
 *
 * Phase A — Upload: drag-and-drop dropzone, sends images through extractDraftBatch,
 *            dispatches ingestOCRDraft to store, shows per-image progress.
 *
 * Phase B — Review: editable card rows pre-populated from OCR extraction.
 *   - fuzzy rows show a warning badge + "Confirmar código" button
 *   - amount_mismatch rows show the three-choice resolver
 *   - "+ Agregar tarjeta" button appends a blank manual row
 *   - isStepValid gate: all codes+amounts filled, no unresolved fuzzy/mismatch
 */
export function OcrEntryStep() {
  const {
    giftcards,
    images,
    addImage,
    removeImage,
    clearImages,
    ingestOCRDraft,
    updateGiftcard,
    removeGiftcard,
    addGiftcard,
    confirmFuzzyMatch,
    resolveAmountMismatch,
    setStep,
  } = useSellFlow();

  const [phase, setPhase] = useState<Phase>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Image upload ────────────────────────────────────────────────────────

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

  // ── OCR extraction ──────────────────────────────────────────────────────

  const { execute: runExtraction } = useAction(extractDraftBatch, {
    onExecute: () => setIsExtracting(true),
    onSuccess: ({ data }) => {
      setIsExtracting(false);
      if (data?.success) {
        ingestOCRDraft(data.cards);
        const ignored = data.ignoredImages.length;
        if (ignored > 0) {
          toast.info(`${ignored} imagen${ignored > 1 ? 'es' : ''} sin código legible`, {
            description: 'Podés agregar esas tarjetas manualmente.',
          });
        }
        setPhase('review');
      } else if (data?.error) {
        toast.error('Error en extracción', { description: data.error });
      }
    },
    onError: ({ error }) => {
      setIsExtracting(false);
      toast.error('Error en extracción', { description: error.serverError || 'No se pudieron leer las imágenes' });
    },
  });

  const handleExtractAll = () => {
    if (images.length === 0) {
      // No images — skip to review with empty manual card
      setPhase('review');
      return;
    }
    runExtraction({
      images: images.map((img) => ({ id: img.id, compressedData: img.compressedData })),
    });
  };

  // ── Add blank manual row ────────────────────────────────────────────────

  const handleAddManualCard = useCallback(() => {
    addGiftcard();
  }, [addGiftcard]);

  // ── Step validity ────────────────────────────────────────────────────────

  const isStepValid =
    giftcards.length > 0 &&
    giftcards.every((card) => {
      if (!card.claimCode || !card.amount) return false;
      return !isBlockingEvidenceState(card.evidence.status);
    });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="grid h-full grid-cols-1 items-start gap-4 pb-20 md:grid-cols-12 md:gap-6 md:pb-0">
      {/* Floating add button (mobile, review phase) */}
      {phase === 'review' && (
        <div className="fixed right-6 bottom-6 z-50 md:hidden">
          <Button
            onClick={handleAddManualCard}
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
          <h2 className="text-foreground mb-0.5 text-xl font-bold md:mb-1 md:text-2xl">
            {phase === 'upload' ? 'Subir Capturas' : 'Revisar Tarjetas'}
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            {phase === 'upload'
              ? 'La IA extraerá los códigos y montos de tus capturas.'
              : 'Revisá y corregí los datos extraídos antes de continuar.'}
          </p>
        </div>

        <div className="space-y-3 border-t border-slate-800 pt-4 md:pt-6">
          {phase === 'upload' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Imágenes cargadas</span>
                <span className="text-foreground font-bold">{images.length}</span>
              </div>
            </div>
          )}

          {phase === 'review' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tarjetas</span>
                <span className="text-foreground font-bold">{giftcards.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pendientes</span>
                <span className="font-bold text-amber-400">
                  {giftcards.filter((g) => isBlockingEvidenceState(g.evidence.status) || !g.claimCode || !g.amount).length}
                </span>
              </div>
            </div>
          )}

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
                {phase === 'upload' ? 'Subida' : 'Revisión'}
              </Badge>
              <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-xs text-blue-400">
                OCR
              </Badge>
            </div>
          </div>

          {/* Navigation */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => (phase === 'review' ? setPhase('upload') : setStep(1))}
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:bg-muted h-10 text-sm md:h-11 md:text-base"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {phase === 'review' ? 'Capturas' : 'Volver'}
            </Button>

            {phase === 'upload' ? (
              <Button
                onClick={handleExtractAll}
                disabled={isUploading || isExtracting}
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 text-sm md:h-11 md:text-base"
              >
                {isExtracting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                {images.length === 0 ? 'Ingresar manual' : 'Extraer'}
              </Button>
            ) : (
              <Button
                onClick={() => setStep(3)}
                disabled={!isStepValid}
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 text-sm md:h-11 md:text-base"
              >
                Continuar <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>

          {phase === 'review' && (
            <Button
              onClick={handleAddManualCard}
              variant="outline"
              size="sm"
              className="border-border text-primary hover:bg-primary/10 hover:text-primary hidden h-10 w-full justify-start px-4 text-sm md:flex md:h-11"
            >
              <Plus className="mr-2 h-4 w-4" /> Agregar tarjeta
            </Button>
          )}
        </div>
      </Card>

      {/* Right Column: Main Content */}
      <Card className="border-border bg-card/50 flex min-h-100 flex-col p-3 backdrop-blur-sm md:col-span-9 md:min-h-125 md:p-6">
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
              <div className="mb-3 flex items-center justify-between md:mb-4">
                <Label className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">Capturas de Gift Cards</Label>
                {isExtracting && (
                  <div className="text-primary flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extrayendo con IA...
                  </div>
                )}
              </div>

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
                  La IA leerá los claim codes y montos de cada captura y creará las filas automáticamente.
                </p>
              </div>

              {/* Uploaded image thumbnails */}
              {images.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      Imágenes ({images.length})
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
                          {/* eslint-disable-next-line @next/next/no-img-element -- previewUrl is a local blob: URL */}
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

              {isUploading && (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Subiendo imágenes...
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="review-phase"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              <div className="mb-3 flex items-center justify-between md:mb-4">
                <Label className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
                  Tarjetas extraídas ({giftcards.length})
                </Label>
                {!isStepValid && (
                  <span className="animate-pulse text-sm font-bold tracking-tight text-amber-500 uppercase">Pendientes</span>
                )}
              </div>

              <div className="custom-scrollbar max-h-[600px] space-y-3 overflow-y-auto pr-1 md:pr-2">
                <AnimatePresence mode="popLayout">
                  {giftcards.map((card, idx) => {
                    const evidenceStatus = card.evidence.status;
                    const isFuzzyPending = evidenceStatus === 'fuzzy_match';
                    const isAmountMismatch = evidenceStatus === 'amount_mismatch';
                    const isVerified = evidenceStatus === 'verified';
                    const sourceImage = card.evidence.matchedImageId ? images.find((img) => img.id === card.evidence.matchedImageId) : null;

                    return (
                      <motion.div
                        key={card.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className={`group border-border bg-muted/20 hover:bg-muted/40 relative rounded-xl border p-3 transition-all md:p-4 ${
                          isFuzzyPending || isAmountMismatch ? 'border-amber-500/30' : ''
                        }`}
                      >
                        {/* Card header */}
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {sourceImage ? (
                              // eslint-disable-next-line @next/next/no-img-element -- blob URL
                              <img
                                src={sourceImage.previewUrl}
                                alt="Captura"
                                className="border-border h-8 w-8 rounded-md border object-cover"
                              />
                            ) : (
                              <div className="bg-primary/20 text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-black">
                                {idx + 1}
                              </div>
                            )}
                            <span className="text-muted-foreground text-sm font-semibold">#{idx + 1}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Source badge */}
                            {card.source === 'ocr' && (
                              <Badge
                                variant="outline"
                                className={
                                  isVerified
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-400'
                                    : isFuzzyPending
                                      ? 'border-amber-500/30 bg-amber-500/10 text-xs text-amber-400'
                                      : 'border-blue-500/30 bg-blue-500/10 text-xs text-blue-400'
                                }
                              >
                                {isVerified ? (
                                  <>
                                    <CheckCircle2 className="mr-1 h-3 w-3" /> OCR
                                  </>
                                ) : isFuzzyPending ? (
                                  <>
                                    <HelpCircle className="mr-1 h-3 w-3" /> Parcial
                                  </>
                                ) : isAmountMismatch ? (
                                  <>
                                    <AlertCircle className="mr-1 h-3 w-3" /> Monto diferente
                                  </>
                                ) : (
                                  <>
                                    <Camera className="mr-1 h-3 w-3" /> OCR
                                  </>
                                )}
                              </Badge>
                            )}
                            {card.source === 'manual' && (
                              <Badge variant="outline" className="border-slate-500/30 bg-slate-500/10 text-xs text-slate-400">
                                Manual
                              </Badge>
                            )}

                            {/* Delete button */}
                            {giftcards.length > 1 && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => removeGiftcard(card.id)}
                                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-8 w-8 rounded-lg"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Editable fields */}
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-12">
                          <div className="col-span-1 md:col-span-3">
                            <Label className="mb-1 ml-1 block text-xs font-bold text-slate-500 uppercase">Monto</Label>
                            <div className="relative">
                              <span className="text-muted-foreground/50 absolute top-2.5 left-3 text-sm">$</span>
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={card.amount}
                                onChange={(e) => updateGiftcard(card.id, 'amount', e.target.value)}
                                className="border-border bg-muted/50 text-foreground focus:border-primary/50 h-10 pl-7 text-base"
                              />
                            </div>
                          </div>

                          <div className="col-span-1 md:col-span-9">
                            <Label className="mb-1 ml-1 block text-xs font-bold text-slate-500 uppercase">Claim Code</Label>
                            <Input
                              placeholder="Ingresá el código"
                              value={card.claimCode}
                              onChange={(e) => updateGiftcard(card.id, 'claimCode', e.target.value)}
                              className="border-border bg-muted/50 text-foreground focus:border-primary/50 h-10 font-mono text-base"
                            />
                          </div>
                        </div>

                        {/* Fuzzy match confirmation */}
                        <AnimatePresence>
                          {isFuzzyPending && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 md:p-3"
                            >
                              <div className="mb-2 flex items-center gap-2">
                                <HelpCircle className="h-4 w-4 text-amber-400" />
                                <span className="text-xs font-semibold text-amber-400">La IA encontró una coincidencia parcial</span>
                              </div>
                              <div className="mb-2 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Extraído:</span>
                                <span className="font-mono font-bold text-amber-400">{card.evidence.extractedCode}</span>
                              </div>
                              <p className="text-muted-foreground mb-2 text-xs">
                                Confirmá si el código mostrado arriba coincide con el código real de esta tarjeta.
                              </p>
                              <Button
                                size="sm"
                                onClick={() => confirmFuzzyMatch(card.id)}
                                className="h-8 w-full bg-amber-500/20 text-xs font-bold text-amber-400 hover:bg-amber-500/30"
                              >
                                Confirmar código
                              </Button>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Amount mismatch resolver */}
                        <AnimatePresence>
                          {isAmountMismatch && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-2 md:p-3"
                            >
                              <div className="mb-2 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-orange-400" />
                                <span className="text-xs font-semibold text-orange-400">El monto extraído difiere del declarado</span>
                              </div>
                              <div className="mb-1 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Declarado:</span>
                                <span className="text-foreground font-bold">${card.amount}</span>
                              </div>
                              <div className="mb-3 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Extraído:</span>
                                <span className="font-bold text-orange-400">${card.evidence.extractedAmount}</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => resolveAmountMismatch(card.id, 'keep-declared')}
                                  className="h-8 bg-slate-500/20 text-xs font-bold text-slate-300 hover:bg-slate-500/30"
                                >
                                  Usar declarado
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => resolveAmountMismatch(card.id, 'accept-extracted')}
                                  className="h-8 bg-orange-500/20 text-xs font-bold text-orange-400 hover:bg-orange-500/30"
                                >
                                  Usar extraído
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
                        </AnimatePresence>

                        {/* Green accent bar for valid cards */}
                        {card.amount && card.claimCode && !isBlockingEvidenceState(card.evidence.status) && (
                          <div className="bg-primary absolute top-1/2 -left-1 h-8 w-1 -translate-y-1/2 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {giftcards.length === 0 && (
                  <div className="border-border bg-muted/20 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12">
                    <div className="bg-muted mb-4 rounded-full p-4">
                      <Camera className="text-muted-foreground/50 h-8 w-8" />
                    </div>
                    <h3 className="mb-1 font-bold">No se extrajeron tarjetas</h3>
                    <p className="text-muted-foreground text-sm">Volvé atrás para subir imágenes o agregá tarjetas manualmente.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
