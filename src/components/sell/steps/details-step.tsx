"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Clipboard, Trash2, Check, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSellFlow } from "@/hooks/use-sell-flow";
import { BulkPasteDialog } from "../bulk-paste-dialog";

export function DetailsStep() {
  const { 
    giftcards, 
    addGiftcard, 
    removeGiftcard, 
    updateGiftcard, 
    handleBulkImport,
    setStep 
  } = useSellFlow();
  
  const [showBulkPasteDialog, setShowBulkPasteDialog] = useState(false);

  const isStep2Valid = giftcards.every(g => g.amount && g.claimCode);

  return (
    <>
      <BulkPasteDialog
        open={showBulkPasteDialog}
        onOpenChange={setShowBulkPasteDialog}
        onImport={handleBulkImport}
      />
      
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-start h-full pb-20 md:pb-0">
      {/* Floating Action Button (Mobile Only) */}
      <div className="fixed bottom-6 right-6 z-50 md:hidden">
        <Button
          onClick={addGiftcard}
          size="icon"
          className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/40 border-2 border-primary/20"
        >
          <Plus className="w-7 h-7" />
        </Button>
      </div>

      {/* Left Column: Actions & Progress */}
      <Card className="md:col-span-3 border-border bg-card/50 backdrop-blur-sm p-3 md:p-6 space-y-4 md:space-y-6 sticky top-0 z-20">
        <div className="flex md:block items-center justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-bold mb-0.5 md:mb-1">Batch Actions</h2>
            <p className="text-muted-foreground text-[10px] md:text-sm">Manage your gift cards.</p>
          </div>
          <div className="md:hidden">
            <span className="bg-muted text-foreground px-2 py-0.5 rounded-full font-bold text-[10px]">{giftcards.length} Cards</span>
          </div>
        </div>

        <div className="hidden md:flex flex-col gap-3">
          <Button
            onClick={addGiftcard}
            variant="outline"
            className="w-full border-border text-primary hover:bg-primary/10 hover:text-primary h-11 justify-start px-4"
          >
            <Plus className="w-4 h-4 mr-3" /> Add Card
          </Button>
          <Button
            onClick={() => setShowBulkPasteDialog(true)}
            variant="outline"
            className="w-full border-border text-primary hover:bg-primary/10 hover:text-primary h-11 justify-start px-4"
          >
            <Clipboard className="w-4 h-4 mr-3" /> Bulk Import
          </Button>
        </div>

        {/* Mobile-only action row */}
        <div className="md:hidden flex gap-2">
            <Button
              onClick={() => setShowBulkPasteDialog(true)}
              variant="outline"
              size="sm"
              className="flex-1 border-border text-primary hover:bg-primary/10 h-9 text-[10px] uppercase font-bold tracking-wider"
            >
              <Clipboard className="w-3 h-3 mr-2" /> Bulk
            </Button>
        </div>

        <div className="pt-4 md:pt-6 border-t border-slate-800 space-y-3">
          <div className="hidden md:flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-medium">Total Cards</span>
            <span className="bg-muted text-foreground px-2 py-0.5 rounded-full font-bold">{giftcards.length}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => setStep(1)}
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:bg-muted h-10 md:h-11 text-xs md:text-sm"
            >
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!isStep2Valid || giftcards.length === 0}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 md:h-11 text-xs md:text-sm"
            >
              Review
            </Button>
          </div>
        </div>
      </Card>

      {/* Right Column: Cards List */}
      <Card className="md:col-span-9 border-border bg-card/50 backdrop-blur-sm p-3 md:p-6 flex flex-col min-h-[400px] md:min-h-[500px]">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <Label className="text-muted-foreground text-[10px] md:text-xs font-semibold uppercase tracking-wider">Gift Card Details</Label>
          {!isStep2Valid && (
            <span className="text-[9px] md:text-[10px] text-amber-500 font-bold uppercase tracking-tight animate-pulse">
              Pending fields
            </span>
          )}
        </div>

        <div className="space-y-3 md:space-y-4 overflow-y-auto pr-1 md:pr-2 custom-scrollbar flex-1 max-h-[500px] md:max-h-[600px]">
          <AnimatePresence mode="popLayout">
            {giftcards.map((card, idx) => (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="group relative flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 items-stretch md:items-end p-3 md:p-5 bg-muted/20 border border-border rounded-xl hover:bg-muted/40 transition-all"
              >
                {/* ID Counter */}
                <div className="md:col-span-1 flex items-center justify-between md:flex-col md:justify-center">
                  <span className="text-[10px] text-muted-foreground font-black md:mb-1">#{idx + 1}</span>
                  <div className="md:hidden">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeGiftcard(card.id)}
                      disabled={giftcards.length === 1}
                      className="text-slate-600 hover:text-red-400 h-6 w-6"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="hidden md:flex w-8 h-8 rounded-full bg-muted border border-border items-center justify-center text-xs font-bold text-muted-foreground">
                    {idx + 1}
                  </div>
                </div>

                {/* Amount & PIN (Grid 2 cols on mobile) */}
                <div className="grid grid-cols-2 md:contents gap-3">
                  <div className="md:col-span-3">
                    <Label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block ml-1">
                      Amount
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 md:top-3 text-muted-foreground/50 text-xs">$</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={card.amount}
                        onChange={(e) => updateGiftcard(card.id, "amount", e.target.value)}
                        className="pl-7 border-border bg-muted/50 text-foreground h-10 md:h-11 focus:border-primary/50 text-sm"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <Label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block ml-1">
                      PIN
                    </Label>
                    <Input
                      type="password"
                      placeholder="Optional"
                      value={card.pinCode || ""}
                      onChange={(e) => updateGiftcard(card.id, "pinCode", e.target.value)}
                      className="border-border bg-muted/50 text-foreground h-10 md:h-11 font-mono focus:border-primary/50 text-sm"
                    />
                  </div>
                </div>

                {/* Claim Code (Full width on mobile) */}
                <div className="md:col-span-4">
                  <Label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block ml-1">
                    Claim Code
                  </Label>
                  <Input
                    placeholder="Enter code"
                    value={card.claimCode}
                    onChange={(e) => updateGiftcard(card.id, "claimCode", e.target.value)}
                    className="border-border bg-muted/50 text-foreground h-10 md:h-11 font-mono focus:border-primary/50 text-sm"
                  />
                </div>

                {/* Delete Desktop */}
                <div className="hidden md:flex md:col-span-1 justify-end">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeGiftcard(card.id)}
                    disabled={giftcards.length === 1}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-11 w-11 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {card.amount && card.claimCode && (
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {giftcards.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-2xl bg-muted/20">
              <div className="p-4 bg-muted rounded-full mb-4">
                <Plus className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-bold mb-1">No cards added yet</h3>
              <p className="text-muted-foreground text-sm">Add cards manually or use the bulk importer.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
    </>
  );
}
