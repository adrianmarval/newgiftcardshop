'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useSellFlow } from '@/hooks/use-sell-flow';
import type { ReviewStepProps } from '@/types';

export function ReviewStep({ onPublish, isPublishing, brandName, countryName, sellRate }: ReviewStepProps) {
  const { giftcards, setStep } = useSellFlow();

  // const totalCards = giftcards.length;
  const totalAmount = giftcards.reduce((sum, card) => sum + (parseFloat(card.amount) || 0), 0);

  const totalToReceive = totalAmount * sellRate;

  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-12 md:gap-6">
      {/* Left Column: Summary & Info */}
      <Card className="border-border bg-card/50 sticky top-0 z-20 flex h-auto flex-col space-y-4 p-4 backdrop-blur-sm md:col-span-4 md:h-full md:space-y-6 md:p-6">
        <div>
          <h2 className="text-foreground mb-0.5 text-xl font-bold md:mb-1 md:text-2xl">Summary</h2>
          <p className="text-muted-foreground text-sm md:text-base">Final review before publishing.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:gap-4">
          <div className="border-border bg-muted/50 space-y-3 rounded-xl border p-3 md:p-4">
            <div className="flex items-center justify-between text-sm md:text-base">
              <span className="text-muted-foreground">Brand</span>
              <span className="text-foreground font-bold">{brandName}</span>
            </div>
            <div className="flex items-center justify-between text-sm md:text-base">
              <span className="text-muted-foreground">Country</span>
              <span className="text-foreground font-bold">{countryName}</span>
            </div>
            <div className="flex items-center justify-between text-sm md:text-base">
              <span className="text-muted-foreground">Total Cards</span>
              <span className="text-foreground font-bold">{giftcards.length} items</span>
            </div>
            <div className="flex items-center justify-between text-sm md:text-base">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="text-primary font-bold">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 md:space-y-4">
          <div className="border-primary/20 bg-primary/5 space-y-2 rounded-xl border p-3 md:p-4">
            <div className="flex items-center justify-between text-sm md:text-xs">
              <span className="text-muted-foreground font-semibold tracking-wider uppercase">Estimated Payment</span>
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary px-1.5 py-0 text-sm">
                {sellRate * 100}% Rate
              </Badge>
            </div>
            <div className="text-primary text-3xl font-black md:text-4xl">${totalToReceive.toFixed(2)}</div>
            <p className="text-muted-foreground text-sm italic">Payment will be processed once cards are confirmed by buyers.</p>
          </div>
        </div>

        <div className="border-border space-y-4 border-t pt-4 md:pt-6">
          <div className="flex gap-3">
            <Button
              onClick={() => setStep(2)}
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:bg-muted h-10 flex-1 text-sm md:h-11 md:text-base"
            >
              Back
            </Button>
            <Button
              onClick={onPublish}
              disabled={isPublishing}
              size="sm"
              className="bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90 h-10 flex-2 text-sm font-bold shadow-lg md:h-11 md:text-base"
            >
              {isPublishing ? 'Wait...' : 'Publish Batch'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Right Column: Cards Preview */}
      <Card className="border-border bg-card/50 flex min-h-100 flex-col p-4 backdrop-blur-sm md:col-span-8 md:min-h-125 md:p-6">
        <div className="mb-4 flex items-center justify-between md:mb-6">
          <Label className="text-muted-foreground text-sm font-semibold tracking-wider uppercase md:text-sm">Verification Items</Label>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-border text-muted-foreground text-sm">
              {giftcards.length} Total
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
          {giftcards.map((card, idx) => (
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
                <Badge className="bg-primary/20 text-primary hover:bg-primary/20 h-4 border-none px-1.5 text-sm">Pending</Badge>
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground tracking-tighter uppercase">Code</span>
                  <span className="text-foreground font-mono font-bold">{card.claimCode}</span>
                </div>
                {card.pinCode && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground tracking-tighter uppercase">PIN</span>
                    <span className="text-muted-foreground font-mono">{card.pinCode}</span>
                  </div>
                )}
              </div>

              <div className="bg-primary/5 absolute top-0 right-0 -mt-8 -mr-8 h-16 w-16 rounded-full transition-transform duration-500 group-hover:scale-150" />
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}
