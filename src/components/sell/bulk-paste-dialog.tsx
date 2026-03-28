"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, AlertTriangle, Code } from "lucide-react";

interface ParsedGiftCard {
  amount: string;
  claimCode: string;
}

interface BulkPasteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (cards: ParsedGiftCard[]) => void;
}

// Regex patterns for different gift card formats
const AMAZON_PATTERN = /(?:^|\n)\s*([A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}|\S+)\s+(\d+(?:\.\d{2})?)\s*$/gm;

export function BulkPasteDialog({ open, onOpenChange, onImport }: BulkPasteDialogProps) {
  const [pasteContent, setPasteContent] = useState("");
  const [parsedCards, setParsedCards] = useState<ParsedGiftCard[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const parseCards = (text: string): { cards: ParsedGiftCard[]; errors: string[] } => {
    const cards: ParsedGiftCard[] = [];
    const errors: string[] = [];

    // Try multiple patterns if needed, for now sticking to the common one
    const matches = [...text.matchAll(AMAZON_PATTERN)];
    
    if (matches.length > 0) {
      matches.forEach((match, idx) => {
        const code = match[1]?.trim();
        const amount = match[2]?.trim();
        
        if (code && amount) {
          cards.push({ claimCode: code, amount });
        } else {
          errors.push(`Line ${idx + 1}: Invalid format detected`);
        }
      });
    } else {
      errors.push("No valid gift card codes found. Expected format: CODE AMOUNT (one per line)");
    }

    return { cards, errors };
  };

  const handleParse = () => {
    if (!pasteContent.trim()) {
      setErrors(["Please paste your gift card data first"]);
      return;
    }

    const { cards, errors: parseErrors } = parseCards(pasteContent);

    if (cards.length === 0) {
      setErrors(parseErrors);
      setParsedCards([]);
      setShowPreview(false);
    } else {
      setParsedCards(cards);
      setErrors(parseErrors);
      setShowPreview(true);
    }
  };

  const handleImport = () => {
    onImport(parsedCards);
    setPasteContent("");
    setParsedCards([]);
    setShowPreview(false);
    setErrors([]);
    onOpenChange(false);
  };

  const handleCopyExample = () => {
    const example = `XXXX-XXXX-XXXX 50.00
YYYY-YYYY-YYYY 100.00
ZZZZ-ZZZZ-ZZZZ 75.50`;
    navigator.clipboard.writeText(example);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Import Gift Cards (Bulk Paste)</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Paste your gift card codes and amounts in the format shown below
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions Card */}
          <Card className="bg-card border-border p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Expected Format</h3>
              </div>
              <p className="text-sm text-muted-foreground">Each line should contain a gift card code followed by the amount:</p>
              <div className="bg-muted rounded p-3 font-mono text-sm text-foreground border border-border">
                {`CODE AMOUNT
XXXX-XXXX-XXXX 50.00
YYYY-YYYY-YYYY 100.00
ZZZZ-ZZZZ-ZZZZ 75.50`}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyExample}
                className="border-border text-foreground hover:bg-muted mt-2"
              >
                <Copy className="w-4 h-4 mr-2" /> Copy Example
              </Button>
            </div>
          </Card>

          {/* Paste Input Area */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Paste your gift cards here:</label>
            <Textarea
              placeholder={"XXXX-XXXX-XXXX 50.00\nYYYY-YYYY-YYYY 100.00\nZZZZ-ZZZZ-ZZZZ 75.50"}
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              className="bg-card border-border text-foreground placeholder:text-muted-foreground font-mono text-sm min-h-32 resize-none"
            />
          </div>

          {/* Errors */}
          <AnimatePresence>
            {errors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Alert className="bg-destructive/10 border-destructive text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="ml-2">
                    {errors.length === 1
                      ? errors[0]
                      : `${errors.length} errors found during parsing`}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preview */}
          <AnimatePresence>
            {showPreview && parsedCards.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Check className="w-5 h-5 text-primary" />
                    Preview ({parsedCards.length} cards)
                  </h4>
                  <Badge variant="outline" className="border-primary text-primary">
                    Ready to import
                  </Badge>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {parsedCards.map((card, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between p-2 bg-muted/50 border border-border rounded text-sm"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold">
                          {idx + 1}
                        </div>
                        <div className="font-mono text-foreground">{card.claimCode}</div>
                      </div>
                      <div className="text-primary font-semibold">${card.amount}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border text-foreground hover:bg-muted flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleParse}
              disabled={!pasteContent.trim()}
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10 flex-1"
            >
              Parse & Preview
            </Button>
            <Button
              onClick={handleImport}
              disabled={parsedCards.length === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1"
            >
              Import {parsedCards.length > 0 && `(${parsedCards.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
