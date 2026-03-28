"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clipboard, AlertTriangle, ChevronRight, Check, X, Info, Edit3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBuyFlow, BuyGiftcardStatus } from "@/hooks/use-buy-flow";

export function RedeemStep() {
  const { 
    foundGiftcards, 
    reportIssue,
    setStep 
  } = useBuyFlow();

  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [correctedAmount, setCorrectedAmount] = useState<string>("");

  const handleReport = (id: string, status: BuyGiftcardStatus) => {
    if (status === "WRONG_AMOUNT") {
      setActiveReportId(id);
      return;
    }
    reportIssue(id, status);
  };

  const submitCorrectedAmount = (id: string) => {
    const val = parseFloat(correctedAmount);
    if (!isNaN(val)) {
      reportIssue(id, "WRONG_AMOUNT", val);
    }
    setActiveReportId(null);
    setCorrectedAmount("");
  };

  // Calculate totals based on status
  const totalAmount = foundGiftcards.reduce((sum, card) => {
    if (card.status === "UNUSED") return sum + card.amount;
    if (card.status === "WRONG_AMOUNT") return sum + (card.reportedAmount ?? 0);
    return sum; // INVALID, USED, DEACTIVATED = 0
  }, 0);

  const reportedCount = foundGiftcards.filter(c => c.status !== "UNUSED").length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 h-full items-start">
      {/* Left Column: Order Summary & Actions */}
      <Card className="md:col-span-4 border-border bg-card/50 backdrop-blur-sm p-4 md:p-6 space-y-4 md:space-y-6 flex flex-col h-auto md:h-full sticky top-0 z-20">
        <div>
          <h2 className="text-lg md:text-xl font-bold mb-0.5 md:mb-1">Redeem & Verify</h2>
          <p className="text-muted-foreground text-[10px] md:text-sm">Copy your codes and report any issues.</p>
        </div>

        <div className="space-y-4">
          <div className="bg-muted/50 border border-border rounded-xl p-3 md:p-4 space-y-3">
            <div className="flex justify-between items-center text-xs md:text-sm">
              <span className="text-muted-foreground">Active Cards</span>
              <span className="font-bold">{foundGiftcards.length - reportedCount} / {foundGiftcards.length}</span>
            </div>
            
            <div className="flex justify-between items-center text-xs md:text-sm pt-2 border-t border-border">
              <span className="text-muted-foreground">Adjusted Total</span>
              <div className="text-right">
                <span className="text-xl font-black text-primary">${totalAmount.toFixed(2)}</span>
                <p className="text-[10px] text-muted-foreground leading-none mt-1">Final amount to pay</p>
              </div>
            </div>
          </div>

          {reportedCount > 0 && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex gap-3 items-start">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
              <p className="text-[10px] md:text-xs text-destructive/80 leading-relaxed font-medium">
                You have reported issues with {reportedCount} card{reportedCount !== 1 ? "s" : ""}. The total has been automatically adjusted.
              </p>
            </div>
          )}

          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex gap-3 items-start">
            <Info className="w-4 h-4 text-primary mt-0.5" />
            <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed">
              Verify each card manually. Once you confirm usage, reporting will be disabled and an order will be generated.
            </p>
          </div>
        </div>

        <div className="mt-auto pt-4 md:pt-6 border-t border-border flex flex-col gap-3">
          <Button
            onClick={() => setStep(4)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10 md:h-11 font-bold shadow-lg shadow-primary/20"
          >
            I have verified all cards <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <p className="text-[9px] text-muted-foreground text-center italic">
            Make sure all reports are correct before proceeding.
          </p>
        </div>
      </Card>

      {/* Right Column: Cards Reveal & Reporting */}
      <Card className="md:col-span-8 border-border bg-card/50 backdrop-blur-sm p-4 md:p-6 flex flex-col min-h-[400px] md:min-h-[500px]">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-muted-foreground text-[10px] md:text-xs font-semibold uppercase tracking-wider">Revealed Codes</Label>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/50">{foundGiftcards.length} items</span>
          </div>
        </div>

        <div className="space-y-3 md:space-y-4">
          <AnimatePresence>
            {foundGiftcards.map((card, idx) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`
                  p-3 md:p-4 rounded-xl border transition-all relative
                  ${card.status === "UNUSED" ? "border-border bg-card/30" : "border-destructive/30 bg-destructive/5 grayscale-[0.5]"}
                `}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black
                      ${card.status === "UNUSED" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}
                    `}>
                      #{idx + 1}
                    </div>
                    
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-black ${card.status === "UNUSED" ? "text-foreground" : "text-muted-foreground line-through"}`}>
                          ${card.amount}
                        </span>
                        {card.status !== "UNUSED" && (
                          <Badge variant="destructive" className="text-[8px] h-4 uppercase font-bold py-0">
                            {card.status.replace("_", " ")}
                            {card.status === "WRONG_AMOUNT" && `: $${card.reportedAmount}`}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1.5 font-mono text-xs md:text-sm font-bold bg-muted/50 px-2 py-1 rounded border border-border group">
                          {card.claimCode}
                          <Button size="icon" variant="ghost" className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" onClick={() => navigator.clipboard.writeText(card.claimCode)}>
                            <Clipboard className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    {card.status === "UNUSED" ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="text-[10px] h-8 border-destructive/30 text-destructive/80 hover:bg-destructive/10">
                            Report issue
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border-border">
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleReport(card.id, "INVALID")}>Invalid code</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleReport(card.id, "ALREADY_USED")}>Already used</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleReport(card.id, "DEACTIVATED")}>Deactivated</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleReport(card.id, "WRONG_AMOUNT")}>Wrong amount</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-[10px] h-8 text-muted-foreground hover:bg-muted" onClick={() => reportIssue(card.id, "UNUSED")}>
                        Undo report
                      </Button>
                    )}
                  </div>
                </div>

                {/* Inline form for WRONG_AMOUNT */}
                {activeReportId === card.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="mt-3 pt-3 border-t border-border flex items-center gap-3 overflow-hidden"
                  >
                    <div className="relative flex-1 max-w-[150px]">
                      <span className="absolute left-2 top-1.5 text-muted-foreground/50 text-xs">$</span>
                      <Input
                        type="number"
                        placeholder="Correct amt"
                        value={correctedAmount}
                        onChange={(e) => setCorrectedAmount(e.target.value)}
                        className="pl-5 h-8 text-xs bg-muted/50 border-border"
                      />
                    </div>
                    <Button size="sm" className="h-8 bg-primary text-primary-foreground text-xs" onClick={() => submitCorrectedAmount(card.id)}>
                      Update
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setActiveReportId(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
