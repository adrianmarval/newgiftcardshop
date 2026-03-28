"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSellFlow } from "@/hooks/use-sell-flow";
import { getBrandById, getCountryById } from "@/actions/giftcard-actions";

interface Brand {
  id: string;
  name: string;
  icon: string;
}

interface Country {
  id: string;
  name: string;
  code: string;
}

interface ReviewStepProps {
  onPublish: () => void;
  isPublishing?: boolean;
}

export function ReviewStep({ onPublish, isPublishing }: ReviewStepProps) {
  const { giftcards, selectedBrand, selectedCountry, setStep } = useSellFlow();
  
  const [selectedBrandObj, setSelectedBrandObj] = useState<Brand | null>(null);
  const [selectedCountryObj, setSelectedCountryObj] = useState<Country | null>(null);

  useEffect(() => {
    if (selectedBrand) {
      getBrandById(selectedBrand).then((data) => setSelectedBrandObj(data as Brand));
    }
    if (selectedCountry) {
      getCountryById(selectedCountry).then((data) => setSelectedCountryObj(data as Country));
    }
  }, [selectedBrand, selectedCountry]);

  const totalCards = giftcards.length;
  const totalAmount = giftcards.reduce((sum, card) => sum + (parseFloat(card.amount) || 0), 0);
  
  // Rate placeholder - in a real app, this would come from the user's sellRate
  const rate = 0.85; 
  const totalToReceive = totalAmount * rate;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-start">
      {/* Left Column: Summary & Info */}
      <Card className="md:col-span-4 border-border bg-card/50 backdrop-blur-sm p-4 md:p-6 space-y-4 md:space-y-6 flex flex-col h-auto md:h-full sticky top-0 z-20">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-foreground mb-0.5 md:mb-1">Summary</h2>
          <p className="text-muted-foreground text-[10px] md:text-sm">Final review before publishing.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:gap-4">
          <div className="bg-muted/50 border border-border rounded-xl p-3 md:p-4 space-y-3">
            <div className="flex justify-between items-center text-xs md:text-sm">
              <span className="text-muted-foreground">Brand</span>
              <span className="font-bold text-foreground">{selectedBrandObj?.name}</span>
            </div>
            <div className="flex justify-between items-center text-xs md:text-sm">
              <span className="text-muted-foreground">Total Cards</span>
              <span className="font-bold text-foreground">{giftcards.length} items</span>
            </div>
            <div className="flex justify-between items-center text-xs md:text-sm">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-bold text-primary">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 md:space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 md:p-4 space-y-2">
            <div className="flex justify-between items-center text-[10px] md:text-xs">
              <span className="text-muted-foreground uppercase tracking-wider font-semibold">Estimated Payment</span>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[9px] px-1.5 py-0">{(rate * 100).toFixed(0)}% Rate</Badge>
            </div>
            <div className="text-2xl md:text-3xl font-black text-primary">
              ${totalToReceive.toFixed(2)}
            </div>
            <p className="text-[10px] text-muted-foreground italic">Payment will be processed once cards are verified.</p>
          </div>
        </div>

        <div className="pt-4 md:pt-6 border-t border-border space-y-4">
          <div className="flex gap-3">
            <Button
              onClick={() => setStep(2)}
              variant="outline"
              size="sm"
              className="flex-1 border-border text-muted-foreground hover:bg-muted h-10 md:h-11 text-xs md:text-sm"
            >
              Back
            </Button>
            <Button
              onClick={onPublish}
              disabled={isPublishing}
              size="sm"
              className="flex-2 bg-primary hover:bg-primary/90 text-primary-foreground h-10 md:h-11 text-xs md:text-sm font-bold shadow-lg shadow-primary/20"
            >
              {isPublishing ? "Wait..." : "Publish Batch"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Right Column: Cards Preview */}
      <Card className="md:col-span-8 border-border bg-card/50 backdrop-blur-sm p-4 md:p-6 flex flex-col min-h-[400px] md:min-h-[500px]">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <Label className="text-muted-foreground text-[10px] md:text-xs font-semibold uppercase tracking-wider">Verification Items</Label>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">{giftcards.length} Total</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {giftcards.map((card, idx) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-3 md:p-4 rounded-xl border border-border bg-muted/20 relative overflow-hidden group hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary">
                    {idx + 1}
                  </div>
                  <span className="text-lg md:text-xl font-black text-foreground">${card.amount}</span>
                </div>
                <Badge className="bg-primary/20 text-primary hover:bg-primary/20 border-none text-[9px] px-1.5 h-4">Pending</Badge>
              </div>
              
              <div className="space-y-1 mt-3">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground uppercase tracking-tighter">Code</span>
                  <span className="font-mono font-bold text-foreground">{card.claimCode}</span>
                </div>
                {card.pinCode && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground uppercase tracking-tighter">PIN</span>
                    <span className="font-mono text-muted-foreground">{card.pinCode}</span>
                  </div>
                )}
              </div>

              <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500" />
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}
