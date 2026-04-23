'use client';

import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import type { CodeDisplayProps } from '@/components/ui/types';

type ClaimCodeFieldProps = CodeDisplayProps & {
  variant?: 'visible' | 'masked';
  showToast?: boolean;
  showCopyButton?: boolean;
};

async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    return true;
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export function ClaimCodeField({ code, variant = 'masked', showToast = true, showCopyButton = true }: ClaimCodeFieldProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const success = await copyToClipboard(code);
    setCopied(true);
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
              className="border-border/60 bg-muted/60 text-foreground hover:bg-muted text-md max-w-35 cursor-pointer truncate rounded-lg border px-2 py-0.5 font-mono font-bold tracking-tight transition-colors"
            >
              {codeDisplay}
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
        className="text-primary/70 hover:text-primary shrink-0 text-[10px] font-black tracking-widest uppercase transition-colors"
      >
        {copied ? '✓' : 'COPY'}
      </button>
    </div>
  );
}
