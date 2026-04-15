'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CheckCircle2, ImageIcon, Camera } from 'lucide-react';
import { useSellFlow } from '@/hooks/use-sell-flow';
import type { ReviewStepProps } from '../types';

export function ReviewStep({ onPublish, isPublishing, brandName, countryName, sellRate, backStep }: ReviewStepProps) {
  const { giftcards, setStep, entryMode, unmatchedImages } = useSellFlow();

  const totalAmount = giftcards.reduce((sum, card) => sum + (parseFloat(card.amount) || 0), 0);
  const totalToReceive = totalAmount * sellRate;

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

  const entryModeLabel = entryMode === 'ocr-first' ? 'OCR' : entryMode === 'manual-first' ? 'Manual' : undefined;

  // Back step: default to step - 1 if not explicitly provided
  const handleBack = () => setStep(backStep ?? Math.max(1, 3));

  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-12 md:gap-6">
      {/* Left Column: Summary & Info */}
      <Card className="border-border bg-card/50 sticky top-0 z-20 flex h-auto flex-col space-y-4 p-4 backdrop-blur-sm md:col-span-4 md:h-full md:space-y-6 md:p-6">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-foreground text-xl font-bold md:text-2xl">Resumen</h2>
            {entryModeLabel && (
              <Badge
                variant="outline"
                className={
                  entryMode === 'ocr-first'
                    ? 'border-blue-500/30 bg-blue-500/10 text-xs text-blue-400'
                    : 'border-slate-500/30 bg-slate-500/10 text-xs text-slate-400'
                }
              >
                {entryModeLabel}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm md:text-base">Revisión final antes de publicar.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:gap-4">
          <div className="border-border bg-muted/50 space-y-3 rounded-xl border p-3 md:p-4">
            <div className="flex items-center justify-between text-sm md:text-base">
              <span className="text-muted-foreground">Marca</span>
              <span className="text-foreground font-bold">{brandName}</span>
            </div>
            <div className="flex items-center justify-between text-sm md:text-base">
              <span className="text-muted-foreground">País</span>
              <span className="text-foreground font-bold">{countryName}</span>
            </div>
            <div className="flex items-center justify-between text-sm md:text-base">
              <span className="text-muted-foreground">Total tarjetas</span>
              <span className="text-foreground font-bold">{giftcards.length} items</span>
            </div>
            <div className="flex items-center justify-between text-sm md:text-base">
              <span className="text-muted-foreground">Monto total</span>
              <span className="text-primary font-bold">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Provenance Summary */}
        <div
          className={`space-y-2 rounded-xl border p-3 md:p-4 ${
            allHaveEvidence ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-500/20 bg-slate-500/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">Proveniencia</span>
            <Badge
              className={
                allHaveEvidence
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-slate-500/30 bg-slate-500/10 text-slate-400'
              }
            >
              {withCaptureCount}/{giftcards.length} con captura
            </Badge>
          </div>
          {allHaveEvidence ? (
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Todas verificadas con captura</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <ImageIcon className="h-4 w-4" />
              <span className="text-sm font-medium">
                {withCaptureCount > 0 ? `${withCaptureCount} con captura` : 'Sin capturas'}
                {noEvidenceCount > 0 && `, ${noEvidenceCount} sin captura (opcional)`}
              </span>
            </div>
          )}

          {/* Unmatched screenshots badge — informational only */}
          {unmatchedImages.length > 0 && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-500/20 bg-slate-500/10 px-2 py-1.5">
              <Camera className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-400">
                {unmatchedImages.length} captura{unmatchedImages.length !== 1 ? 's' : ''} sin asignar
              </span>
            </div>
          )}
        </div>

        <div className="space-y-3 md:space-y-4">
          <div className="border-primary/20 bg-primary/5 space-y-2 rounded-xl border p-3 md:p-4">
            <div className="flex items-center justify-between text-sm md:text-xs">
              <span className="text-muted-foreground font-semibold tracking-wider uppercase">Pago estimado</span>
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary px-1.5 py-0 text-sm">
                {sellRate * 100}% Rate
              </Badge>
            </div>
            <div className="text-primary text-3xl font-black md:text-4xl">${totalToReceive.toFixed(2)}</div>
            <p className="text-muted-foreground text-sm italic">El pago se procesará una vez confirmadas por los compradores.</p>
          </div>
        </div>

        <div className="border-border space-y-4 border-t pt-4 md:pt-6">
          <div className="flex gap-3">
            <Button
              onClick={handleBack}
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:bg-muted h-10 flex-1 text-sm md:h-11 md:text-base"
            >
              Volver
            </Button>
            <Button
              onClick={onPublish}
              disabled={isPublishing}
              size="sm"
              className="bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90 h-10 flex-2 text-sm font-bold shadow-lg md:h-11 md:text-base"
            >
              {isPublishing ? 'Publicando...' : 'Publicar Lote'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Right Column: Cards Preview */}
      <Card className="border-border bg-card/50 flex min-h-100 flex-col p-4 backdrop-blur-sm md:col-span-8 md:min-h-125 md:p-6">
        <div className="mb-4 flex items-center justify-between md:mb-6">
          <Label className="text-muted-foreground text-sm font-semibold tracking-wider uppercase md:text-sm">Tarjetas</Label>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-border text-muted-foreground text-sm">
              {giftcards.length} Total
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
          {giftcards.map((card, idx) => {
            const matchedImageId = card.evidence?.matchedImageId ?? card.matchedImageId;
            const evidenceStatus = card.evidence?.status ?? card.validationState;
            const hasCapture = !!matchedImageId && evidenceStatus !== 'skipped' && evidenceStatus !== 'no_capture';

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group border-border bg-muted/20 hover:border-primary/30 relative overflow-hidden rounded-xl border p-3 transition-all md:p-4"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/20 text-primary flex h-6 w-6 items-center justify-center rounded-full text-sm font-black">
                      {idx + 1}
                    </div>
                    <span className="text-foreground text-xl font-black md:text-2xl">${card.amount}</span>
                  </div>

                  {/* Provenance status badge — informational only */}
                  {hasCapture ? (
                    <Badge className="border-emerald-500/30 bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Con captura
                    </Badge>
                  ) : (
                    <Badge className="border-slate-500/30 bg-slate-500/20 text-slate-400">
                      <ImageIcon className="mr-1 h-3 w-3" />
                      Sin captura
                    </Badge>
                  )}
                </div>

                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground tracking-tighter uppercase">Código</span>
                    <span className="text-foreground font-mono font-bold">{card.claimCode}</span>
                  </div>
                  {card.pinCode && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground tracking-tighter uppercase">PIN</span>
                      <span className="text-muted-foreground font-mono">{card.pinCode}</span>
                    </div>
                  )}
                  {card.source === 'ocr' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground tracking-tighter uppercase">Origen</span>
                      <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 px-1.5 py-0 text-xs text-blue-400">
                        OCR
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="bg-primary/5 absolute top-0 right-0 -mt-8 -mr-8 h-16 w-16 rounded-full transition-transform duration-500 group-hover:scale-150" />
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
