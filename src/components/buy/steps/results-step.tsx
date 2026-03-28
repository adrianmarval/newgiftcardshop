"use client";

import { motion } from "framer-motion";
import { Trash2, ChevronRight, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBuyFlow } from "@/hooks/use-buy-flow";
import { BRANDS } from "@/lib/constants/giftcards";

export function ResultsStep() {
  const { 
    foundGiftcards, 
    removeGiftcard, 
    setStep,
    selectedBrand,
    targetAmount
  } = useBuyFlow();

  const brandData = BRANDS.find(b => b.id === selectedBrand);
  const totalAmount = foundGiftcards.reduce((sum, card) => sum + card.amount, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 h-full items-start">
      {/* Left Column: Selection Summary */}
      <Card className="md:col-span-4 border-border bg-card/50 backdrop-blur-sm p-4 md:p-6 space-y-4 md:space-y-6 flex flex-col h-auto md:h-full sticky top-0 z-20">
        <div>
          <h2 className="text-lg md:text-xl font-bold mb-0.5 md:mb-1">Selection</h2>
          <p className="text-muted-foreground text-[10px] md:text-sm">Review your proposed gift cards.</p>
        </div>

        <div className="space-y-4">
          <div className="bg-muted/50 border border-border rounded-xl p-3 md:p-4 space-y-3">
            <div className="flex justify-between items-center text-xs md:text-sm">
              <span className="text-muted-foreground">Search Target</span>
              <span className="font-bold">${targetAmount}</span>
            </div>
            <div className="flex justify-between items-center text-xs md:text-sm">
              <span className="text-muted-foreground">Found Cards</span>
              <span className="font-bold">{foundGiftcards.length} items</span>
            </div>
            <div className="flex justify-between items-center text-xs md:text-sm pt-2 border-t border-border">
              <span className="text-muted-foreground">Total to Pay</span>
              <div className="text-right">
                <span className="text-xl font-black text-primary">${totalAmount.toFixed(2)}</span>
                <p className="text-[10px] text-muted-foreground leading-none mt-1">Order value</p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex gap-3 items-start">
            <Info className="w-4 h-4 text-primary mt-0.5" />
            <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed">
              Codes will be revealed in the next step. You can remove cards you don&apos;t want from the list on the right.
            </p>
          </div>
        </div>

        <div className="mt-auto pt-4 md:pt-6 border-t border-border flex gap-3">
          <Button
            onClick={() => setStep(1)}
            variant="outline"
            className="flex-1 border-border text-muted-foreground hover:bg-muted h-10 md:h-11"
          >
            Adjust
          </Button>
          <Button
            onClick={() => setStep(3)}
            disabled={foundGiftcards.length === 0}
            className="flex-2 bg-primary hover:bg-primary/90 text-primary-foreground h-10 md:h-11 font-bold shadow-lg shadow-primary/20"
          >
            Confirm Selection <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </Card>

      {/* Right Column: Cards List */}
      <Card className="md:col-span-8 border-border bg-card/50 backdrop-blur-sm p-4 md:p-6 flex flex-col min-h-[400px] md:min-h-[500px]">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-muted-foreground text-[10px] md:text-xs font-semibold uppercase tracking-wider">Proposed Bundle</Label>
          <span className="text-[10px] text-muted-foreground/50">{foundGiftcards.length} items</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 overflow-y-auto pr-1 custom-scrollbar">
          {foundGiftcards.map((card, idx) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-3 md:p-4 rounded-xl border border-border bg-muted/20 relative overflow-hidden group hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center text-xl shadow-sm">
                    {brandData?.icon}
                  </div>
                  <div>
                    <div className="text-lg font-black text-foreground">${card.amount}</div>
                    <div className="text-[10px] font-mono text-muted-foreground/50 tracking-tighter uppercase whitespace-nowrap">
                      CODE: XXXX-XXXX-XXXX
                    </div>
                  </div>
                </div>
                
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeGiftcard(card.id)}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 rounded-full -mr-6 -mt-6 transition-transform group-hover:scale-150 duration-500" />
            </motion.div>
          ))}
          
          {foundGiftcards.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-2xl bg-muted/20 text-center">
              <div className="p-4 bg-muted rounded-full mb-4">
                <Trash2 className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-bold mb-1">Bundle is empty</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">Go back to search or adjust your criteria to find more cards.</p>
              <Button 
                variant="outline" 
                onClick={() => setStep(1)} 
                className="mt-6 border-primary/50 text-primary hover:bg-primary/10"
              >
                Return to Search
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
