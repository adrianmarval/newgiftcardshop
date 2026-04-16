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
  const { giftcards, setStep, unmatchedImages } = useSellFlow();

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
            <div className="rounded-xl border border-slate-500/20 bg-slate-500/5 p-2 md:p-4">
              <p className="text-[10px] font-semibold text-slate-300 md:text-sm">Warnings</p>
              <p className="text-[10px] text-slate-400 md:text-sm">Cards without capture or unassigned captures.</p>
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
              disabled={isPublishing}
              size="sm"
              className="bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90 h-9 flex-2 text-xs font-bold shadow-lg md:h-11 md:text-base"
            >
              {isPublishing ? 'Publishing...' : 'Publish Batch'}
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
                className="group border-border bg-muted/20 hover:border-primary/30 relative overflow-hidden rounded-xl border p-1.5 transition-all md:p-3"
              >
                <div className="flex flex-col gap-1.5">
                  {/* Header Row: Index, Amount and Badge (Mobile: Unified line) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="bg-primary/20 text-primary flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black">
                        {idx + 1}
                      </div>
                      <span className="text-foreground text-base font-black md:text-xl">${card.amount}</span>
                    </div>

                    {hasCapture ? (
                      <Badge className="border-emerald-500/30 bg-emerald-500/20 px-1 py-0 text-[9px] text-emerald-400 md:text-xs">
                        <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" />
                        Capture
                      </Badge>
                    ) : (
                      <Badge className="border-slate-500/30 bg-slate-500/20 px-1 py-0 text-[9px] text-slate-400 md:text-xs">
                        <ImageIcon className="mr-0.5 h-2.5 w-2.5" />
                        No capture
                      </Badge>
                    )}
                  </div>

                  {/* Data Row: Code and PIN (Mobile: High density) */}
                  <div className="flex flex-col gap-1 md:mt-2 md:space-y-1">
                    <div className="flex items-center justify-between text-[11px] md:text-sm">
                      <span className="text-muted-foreground tracking-tighter uppercase">Code</span>
                      <span className="text-foreground truncate font-mono font-bold">{card.claimCode}</span>
                    </div>
                    {card.pinCode && (
                      <div className="flex items-center justify-between text-[11px] md:text-sm">
                        <span className="text-muted-foreground tracking-tighter uppercase">PIN</span>
                        <span className="text-muted-foreground font-mono">{card.pinCode}</span>
                      </div>
                    )}
                  </div>
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
