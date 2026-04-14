'use client';

import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { CodeDisplayProps } from '@/components/ui/types';

export function ClaimCodeField({ code }: CodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex w-full items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <code
              onClick={copy}
              className="border-border/60 bg-muted/60 text-foreground hover:bg-muted max-w-35 cursor-pointer truncate rounded-lg border px-2.5 py-1 font-mono text-base font-bold tracking-tight transition-colors"
            >
              {code.slice(0, 4)}••••{code.slice(-4)}
            </code>
          </TooltipTrigger>
          <TooltipContent className="border-border bg-background text-sm font-bold">
            <p>Click to copy: {code}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <button
        onClick={(e) => {
          e.stopPropagation();
          copy();
        }}
        className="text-primary/70 hover:text-primary text-sm font-black tracking-widest uppercase transition-colors"
      >
        {copied ? 'DONE!' : 'COPY'}
      </button>
    </div>
  );
}
