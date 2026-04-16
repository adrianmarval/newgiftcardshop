'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Check, Copy, AlertTriangle, Code, Info, AlertCircle } from 'lucide-react';
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
      setErrors(['Paste one or more cards first']);
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
      <DialogContent className="border-border bg-card w-[98vw] max-w-2xl p-3 md:p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-foreground text-xl md:text-2xl">Import cards</DialogTitle>
          <DialogDescription className="text-muted-foreground hidden text-xs md:block md:text-sm">
            Paste one or several cards to load them in bulk.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 md:space-y-4">
          <Card className="bg-card border-none p-1 md:p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 md:gap-2">
                <Code className="text-primary h-4 w-4 md:h-5 md:w-5" />
                <h3 className="text-foreground text-sm font-semibold md:text-base">Expected format</h3>
              </div>
              <p className="text-muted-foreground hidden text-xs md:block md:text-sm">
                Each line must contain a code and its amount separated by a space.
              </p>
              <div className="mb-2 flex items-center justify-between">
                <div className="border-border bg-muted text-foreground flex-1 rounded border p-2 font-mono text-[10px] md:p-3 md:text-base">
                  {`CODE AMOUNT
XXXX-XXXXXX-XXXX 50.00
`}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyExample}
                  className="border-border text-foreground hover:bg-muted ml-2 h-8 text-[10px] md:h-11 md:text-xs"
                >
                  <Copy className="mr-1.5 h-3 w-3 md:mr-2 md:h-4 md:w-4" /> Copy example
                </Button>
              </div>

              <div className="hidden space-y-2 pt-2 md:block">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Format Examples</span>
                  <span className="text-muted-foreground/50 text-[10px] italic">Amount is optional</span>
                </div>
                <div className="border-border bg-muted/20 grid grid-cols-2 gap-2 rounded-xl border p-2 font-mono text-[10px]">
                  <div className="text-muted-foreground">CODE123, 50.00</div>
                  <div className="text-muted-foreground">CODE123 50.00</div>
                  <div className="text-muted-foreground">CODE123:PIN456, 100.00</div>
                  <div className="text-muted-foreground">CODE123:PIN456 100.00</div>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-1">
            <label className="text-foreground text-[10px] font-bold tracking-tight uppercase md:text-xs">Content:</label>
            <Textarea
              placeholder="Paste your codes here..."
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              className="border-border bg-muted/30 focus-visible:ring-primary h-40 resize-none rounded-xl font-mono text-xs md:h-48 md:text-base"
            />
          </div>

          <AnimatePresence>
            {errors.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Alert variant="destructive" className="border-destructive/20 bg-destructive/10 rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="ml-2">
                    {errors.length === 1 ? errors[0] : `${errors.length} errors found interpreting the content`}
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
                  <h4 className="text-foreground flex items-center gap-1.5 font-bold md:gap-2">
                    <Check className="text-primary h-4 w-4 md:h-5 md:w-5" />
                    Preview ({parsedCards.length})
                  </h4>
                  <div className="flex items-center gap-1 md:gap-2">
                    {parseDuplicateCount > 0 && (
                      <Badge variant="outline" className="border-amber-500 px-1 py-0 text-[9px] text-amber-500 md:px-2 md:text-[10px]">
                        {parseDuplicateCount} Duplicates
                      </Badge>
                    )}
                    <Badge variant="outline" className="border-primary text-primary px-1 py-0 text-[9px] md:px-2 md:text-[10px]">
                      Ready
                    </Badge>
                  </div>
                </div>

                {/* Duplicate info notice */}
                {parseDuplicateCount > 0 && (
                  <Alert className="border-amber-500/30 bg-amber-500/5 p-2 py-1.5 text-amber-600 md:p-4">
                    <Info className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <AlertDescription className="ml-1 text-[10px] md:ml-2 md:text-sm">
                      {parseDuplicateCount} duplicate{parseDuplicateCount !== 1 ? 's' : ''} ignored.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="max-h-32 space-y-1 overflow-y-auto md:max-h-48">
                  {parsedCards.map((card, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="border-border bg-muted/30 flex items-center justify-between rounded border px-2 py-1.5 text-xs md:p-2 md:text-base"
                    >
                      <div className="flex flex-1 items-center gap-2 md:gap-3">
                        <div className="bg-primary/20 text-primary flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black md:h-6 md:w-6 md:text-sm">
                          {idx + 1}
                        </div>
                        <div className="text-foreground truncate font-mono text-[10px] md:text-base">{card.claimCode}</div>
                      </div>
                      {card.amount && <div className="text-primary text-[10px] font-black md:text-base">${card.amount}</div>}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2 md:flex-row md:gap-3">
            <div className="flex flex-1 gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-border text-muted-foreground hover:bg-muted h-9 flex-1 text-xs md:h-11 md:text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleParse}
                disabled={!pasteContent.trim()}
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10 h-9 flex-1 text-xs md:h-11 md:text-sm"
              >
                Review
              </Button>
            </div>
            <Button
              onClick={handleImport}
              disabled={parsedCards.length === 0}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 w-full text-xs font-bold shadow-lg md:h-11 md:w-auto md:flex-1 md:text-sm"
            >
              Import {parsedCards.length > 0 ? `(${parsedCards.length})` : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
