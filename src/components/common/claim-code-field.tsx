'use client';

import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { Button } from '@/components/ui/button';
import { showAlert } from '@/lib/ui';

interface ClaimCodeFieldProps {
  code: string;
  variant?: 'visible' | 'masked';
  showToast?: boolean;
  showCopyButton?: boolean;
}

export function ClaimCodeField({ code, variant = 'masked', showToast = true, showCopyButton = true }: ClaimCodeFieldProps) {
  const [copied, setCopied] = useState(false);

  const copy = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const success = await copyToClipboard(code);
    setCopied(true);
    if (showToast && success) {
      showAlert.toast.success('Code copied to clipboard');
    } else {
      showAlert.toast.error('Failed to copy code');
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const codeDisplay = variant === 'masked' ? `${code.slice(0, 4)}••••${code.slice(-4)}` : code;

  if (!showCopyButton) {
    return (
      <code onClick={copy} className="text-foreground text-md cursor-pointer font-mono transition-opacity hover:opacity-80">
        {codeDisplay}
      </code>
    );
  }

  return (
    <div className="flex w-full items-center gap-1.5">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <code
              onClick={copy}
              className="border-border/60 bg-muted/60 text-foreground hover:bg-muted text-md max-w-40 cursor-pointer truncate rounded-lg border px-2 py-0.5 font-mono font-bold tracking-tight transition-colors sm:max-w-48"
            >
              {codeDisplay}
            </code>
          </TooltipTrigger>
          <TooltipContent className="border-border bg-popover text-popover-foreground border p-2">
            <p className="font-mono text-xs">Click to copy: {code}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Button
        variant={'link'}
        onClick={(e) => {
          e.stopPropagation();
          copy();
        }}
        className="text-primary/70 hover:text-primary shrink-0 text-[10px] font-black tracking-widest uppercase transition-colors"
      >
        {copied ? '✓' : 'COPY'}
      </Button>
    </div>
  );
}
