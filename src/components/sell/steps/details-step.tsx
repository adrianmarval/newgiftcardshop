'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clipboard, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useSellFlow } from '@/hooks/use-sell-flow';
import { BulkPasteDialog } from '@/components/sell/bulk-paste-dialog';

export function DetailsStep() {
  const { giftcards, addGiftcard, removeGiftcard, updateGiftcard, handleBulkImport, setStep } = useSellFlow();

  const [showBulkPasteDialog, setShowBulkPasteDialog] = useState(false);

  const isStep2Valid = giftcards.every((g) => g.amount && g.claimCode);

  return (
    <>
      <BulkPasteDialog open={showBulkPasteDialog} onOpenChange={setShowBulkPasteDialog} onImport={handleBulkImport} />

      <div className="grid h-full grid-cols-1 items-start gap-4 pb-20 md:grid-cols-12 md:gap-6 md:pb-0">
        {/* Floating Action Button (Mobile Only) */}
        <div className="fixed right-6 bottom-6 z-50 md:hidden">
          <Button
            onClick={addGiftcard}
            size="icon"
            className="border-primary/20 bg-primary text-primary-foreground shadow-primary/40 hover:bg-primary/90 h-14 w-14 rounded-full border-2 shadow-xl"
          >
            <Plus className="h-7 w-7" />
          </Button>
        </div>

        {/* Left Column: Actions & Progress */}
        <Card className="border-border bg-card/50 sticky top-0 z-20 space-y-4 p-3 backdrop-blur-sm md:col-span-3 md:space-y-6 md:p-6">
          <div className="flex items-center justify-between md:block">
            <div>
              <h2 className="mb-0.5 text-xl font-bold md:mb-1 md:text-2xl">Batch Actions</h2>
              <p className="text-muted-foreground text-sm md:text-base">Manage your gift cards.</p>
            </div>
            <div className="md:hidden">
              <span className="bg-muted text-foreground rounded-full px-2 py-0.5 text-sm font-bold">{giftcards.length} Cards</span>
            </div>
          </div>

          <div className="hidden flex-col gap-3 md:flex">
            <Button
              onClick={addGiftcard}
              variant="outline"
              className="border-border text-primary hover:bg-primary/10 hover:text-primary h-11 w-full justify-start px-4"
            >
              <Plus className="mr-3 h-4 w-4" /> Add Card
            </Button>
            <Button
              onClick={() => setShowBulkPasteDialog(true)}
              variant="outline"
              className="border-border text-primary hover:bg-primary/10 hover:text-primary h-11 w-full justify-start px-4"
            >
              <Clipboard className="mr-3 h-4 w-4" /> Bulk Import
            </Button>
          </div>

          {/* Mobile-only action row */}
          <div className="flex gap-2 md:hidden">
            <Button
              onClick={() => setShowBulkPasteDialog(true)}
              variant="outline"
              size="sm"
              className="border-border text-primary hover:bg-primary/10 h-9 flex-1 text-sm font-bold tracking-wider uppercase"
            >
              <Clipboard className="mr-2 h-3 w-3" /> Bulk
            </Button>
          </div>

          <div className="space-y-3 border-t border-slate-800 pt-4 md:pt-6">
            <div className="hidden items-center justify-between text-xs md:flex">
              <span className="text-muted-foreground font-medium">Total Cards</span>
              <span className="bg-muted text-foreground rounded-full px-2 py-0.5 font-bold">{giftcards.length}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                size="sm"
                className="border-border text-muted-foreground hover:bg-muted h-10 text-sm md:h-11 md:text-base"
              >
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!isStep2Valid || giftcards.length === 0}
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 text-sm md:h-11 md:text-base"
              >
                Review
              </Button>
            </div>
          </div>
        </Card>

        {/* Right Column: Cards List */}
        <Card className="border-border bg-card/50 flex min-h-100 flex-col p-3 backdrop-blur-sm md:col-span-9 md:min-h-125 md:p-6">
          <div className="mb-3 flex items-center justify-between md:mb-4">
            <Label className="text-muted-foreground text-sm font-semibold tracking-wider uppercase md:text-sm">Gift Card Details</Label>
            {!isStep2Valid && (
              <span className="animate-pulse text-sm font-bold tracking-tight text-amber-500 uppercase md:text-sm">Pending fields</span>
            )}
          </div>

          <div className="custom-scrollbar max-h-125 flex-1 space-y-3 overflow-y-auto pr-1 md:max-h-150 md:space-y-4 md:pr-2">
            <AnimatePresence mode="popLayout">
              {giftcards.map((card, idx) => (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="group border-border bg-muted/20 hover:bg-muted/40 relative flex flex-col items-stretch gap-3 rounded-xl border p-3 transition-all md:grid md:grid-cols-12 md:items-end md:gap-4 md:p-5"
                >
                  {/* ID Counter */}
                  <div className="flex items-center justify-between md:col-span-1 md:flex-col md:justify-center">
                    <span className="text-muted-foreground text-sm font-black md:mb-1">#{idx + 1}</span>
                    <div className="md:hidden">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeGiftcard(card.id)}
                        disabled={giftcards.length === 1}
                        className="h-6 w-6 text-slate-600 hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="border-border bg-muted text-muted-foreground hidden h-8 w-8 items-center justify-center rounded-full border text-sm font-bold md:flex">
                      {idx + 1}
                    </div>
                  </div>

                  {/* Amount & PIN (Grid 2 cols on mobile) */}
                  <div className="grid grid-cols-2 gap-3 md:contents">
                    <div className="md:col-span-3">
                      <Label className="mb-1 ml-1 block text-sm font-bold text-slate-500 uppercase">Amount</Label>
                      <div className="relative">
                        <span className="text-muted-foreground/50 absolute top-2.5 left-3 text-sm md:top-3">$</span>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={card.amount}
                          onChange={(e) => updateGiftcard(card.id, 'amount', e.target.value)}
                          className="border-border bg-muted/50 text-foreground focus:border-primary/50 h-10 pl-7 text-base md:h-11"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-3">
                      <Label className="mb-1 ml-1 block text-sm font-bold text-slate-500 uppercase">PIN</Label>
                      <Input
                        type="password"
                        placeholder="Optional"
                        value={card.pinCode || ''}
                        onChange={(e) => updateGiftcard(card.id, 'pinCode', e.target.value)}
                        className="border-border bg-muted/50 text-foreground focus:border-primary/50 h-10 font-mono text-base md:h-11"
                      />
                    </div>
                  </div>

                  {/* Claim Code (Full width on mobile) */}
                  <div className="md:col-span-4">
                    <Label className="mb-1 ml-1 block text-sm font-bold text-slate-500 uppercase">Claim Code</Label>
                    <Input
                      placeholder="Enter code"
                      value={card.claimCode}
                      onChange={(e) => updateGiftcard(card.id, 'claimCode', e.target.value)}
                      className="border-border bg-muted/50 text-foreground focus:border-primary/50 h-10 font-mono text-base md:h-11"
                    />
                  </div>

                  {/* Delete Desktop */}
                  <div className="hidden justify-end md:col-span-1 md:flex">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeGiftcard(card.id)}
                      disabled={giftcards.length === 1}
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-11 w-11 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {card.amount && card.claimCode && (
                    <div className="bg-primary absolute top-1/2 -left-1 h-8 w-1 -translate-y-1/2 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {giftcards.length === 0 && (
              <div className="border-border bg-muted/20 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12">
                <div className="bg-muted mb-4 rounded-full p-4">
                  <Plus className="text-muted-foreground/50 h-8 w-8" />
                </div>
                <h3 className="mb-1 font-bold">No cards added yet</h3>
                <p className="text-muted-foreground text-sm">Add cards manually or use the bulk importer.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
