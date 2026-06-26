'use client';

import { Button } from '@/components/ui/button';
import { Copy, ShieldCheck } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils/clipboard';

export interface BackupCodesDisplayProps {
  isSpanish: boolean;
  backupCodes: string[];
  onDone: () => void;
}

export const BackupCodesDisplay = ({ isSpanish, backupCodes, onDone }: BackupCodesDisplayProps) => {
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center justify-center gap-1 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
        </div>
        <p className="text-muted-foreground text-xs md:text-sm">
          {isSpanish ? 'Cada código se usa solo una vez' : 'Each code can be used once'}
        </p>
      </div>

      <div className="border-border bg-muted/50 grid grid-cols-2 gap-1 rounded-md border p-2 font-mono text-xs md:gap-1.5 md:p-2.5 md:text-sm">
        {backupCodes.map((code, i) => (
          <div key={i} className="flex items-center justify-between p-0.5">
            <span>{code}</span>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        className="h-8 w-full rounded-md text-xs font-medium md:h-9 md:text-sm"
        onClick={() => copyToClipboard(backupCodes.join('\n'))}
      >
        <Copy className="mr-1 h-2.5 w-2.5" />
        {isSpanish ? 'Copiar Todos' : 'Copy All'}
      </Button>
      <Button
        onClick={onDone}
        className="h-8 w-full rounded-md bg-emerald-500 text-xs font-semibold hover:bg-emerald-400 md:h-9 md:text-sm"
      >
        {isSpanish ? 'He Guardado' : "I've Saved"}
      </Button>
    </div>
  );
};
