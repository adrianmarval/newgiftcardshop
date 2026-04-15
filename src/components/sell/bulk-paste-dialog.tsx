'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Check, Copy, AlertTriangle, Code, Info } from 'lucide-react';
import type { ParsedGiftcard } from '@/types';
import { parseClaimCodes } from '@/lib/utils/claim-code-parser';
import type { BulkPasteDialogProps } from './types';

export function BulkPasteDialog({ open, onOpenChange, onImport }: BulkPasteDialogProps) {
  const [pasteContent, setPasteContent] = useState('');
  const [parsedCards, setParsedCards] = useState<ParsedGiftcard[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [parseDuplicateCount, setParseDuplicateCount] = useState(0);

  const handleParse = () => {
    if (!pasteContent.trim()) {
      setErrors(['Please paste your gift card data first']);
      return;
    }

    const { parsed, errors: parseErrors, duplicateCount } = parseClaimCodes(pasteContent);

    setParseDuplicateCount(duplicateCount);

    if (parsed.length === 0) {
      setErrors(parseErrors);
      setParsedCards([]);
      setShowPreview(false);
    } else {
      setParsedCards(parsed);
      setErrors(parseErrors);
      setShowPreview(true);
    }
  };

  const handleImport = () => {
    onImport(parsedCards);
    setPasteContent('');
    setParsedCards([]);
    setShowPreview(false);
    setErrors([]);
    setParseDuplicateCount(0);
    onOpenChange(false);
  };

  const handleCopyExample = () => {
    const example = `XXXX-XXXXXX-XXXX 50.00
YYYY-YYYYYY-YYYY 100.00
ZZZZ-ZZZZZZ-ZZZZZ 75.50`;
    navigator.clipboard.writeText(example);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card max-w-2xl min-w-md md:min-w-xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">Import Gift Cards (Bulk Paste)</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Paste your gift card codes and amounts in the format shown below
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {/* Instructions Card */}
          <Card className="border-border bg-card p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Code className="text-primary h-5 w-5" />
                <h3 className="text-foreground font-semibold">Expected Format</h3>
              </div>
              <p className="text-muted-foreground text-base">Each line should contain a gift card code followed by the amount:</p>
              <div className="border-border bg-muted text-foreground rounded border p-3 font-mono text-base">
                {`CODE AMOUNT
XXXX-XXXXXX-XXXX 50.00
YYYY-YYYYYY-YYYY 100.00
ZZZZ-ZZZZZZ-ZZZZZ 75.50`}
              </div>
              <Button size="sm" variant="outline" onClick={handleCopyExample} className="border-border text-foreground hover:bg-muted mt-2">
                <Copy className="mr-2 h-4 w-4" /> Copy Example
              </Button>
            </div>
          </Card>

          {/* Paste Input Area */}
          <div className="space-y-2">
            <label className="text-foreground text-base font-medium">Paste your gift cards here:</label>
            <Textarea
              placeholder={'XXXX-XXXXXX-XXXX 50.00\nYYYY-YYYYYY-YYYY 100.00\nZZZZ-ZZZZZZ-ZZZZZ 75.50'}
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              className="border-border bg-card text-foreground placeholder:text-muted-foreground max-h-24 min-h-32 resize-none font-mono text-base"
            />
          </div>

          {/* Errors */}
          <AnimatePresence>
            {errors.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Alert className="border-destructive bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="ml-2">
                    {errors.length === 1 ? errors[0] : `${errors.length} errors found during parsing`}
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
                  <h4 className="text-foreground flex items-center gap-2 font-semibold">
                    <Check className="text-primary h-5 w-5" />
                    Preview ({parsedCards.length} cards)
                  </h4>
                  <div className="flex items-center gap-2">
                    {parseDuplicateCount > 0 && (
                      <Badge variant="outline" className="border-amber-500 text-amber-500">
                        {parseDuplicateCount} duplicate{parseDuplicateCount !== 1 ? 's' : ''} ignored
                      </Badge>
                    )}
                    <Badge variant="outline" className="border-primary text-primary">
                      Ready to import
                    </Badge>
                  </div>
                </div>

                {/* Duplicate info notice */}
                {parseDuplicateCount > 0 && (
                  <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="ml-2">
                      {parseDuplicateCount} duplicate code{parseDuplicateCount !== 1 ? 's were' : ' was'} found in your paste and{' '}
                      {parseDuplicateCount !== 1 ? 'have' : 'has'} been ignored. Only unique codes are shown below.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {parsedCards.map((card, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="border-border bg-muted/50 flex items-center justify-between rounded border p-2 text-base"
                    >
                      <div className="flex flex-1 items-center gap-3">
                        <div className="bg-primary/20 text-primary flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold">
                          {idx + 1}
                        </div>
                        <div className="text-foreground font-mono">{card.claimCode}</div>
                      </div>
                      {card.amount && <div className="text-primary font-semibold">${card.amount}</div>}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border text-foreground hover:bg-muted flex-1">
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
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1"
            >
              Import {parsedCards.length > 0 && `(${parsedCards.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
