"use client";

import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { CodeDisplayProps } from "@/types";

export function ClaimCodeField({ code }: CodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <code
              onClick={copy}
              className="text-base font-mono bg-muted/60 px-2.5 py-1 rounded-lg border border-border/60 cursor-pointer hover:bg-muted transition-colors font-bold tracking-tight text-foreground truncate max-w-35"
            >
              {code.slice(0, 4)}••••{code.slice(-4)}
            </code>
          </TooltipTrigger>
          <TooltipContent className="bg-background border-border text-sm font-bold">
            <p>Click to copy: {code}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <button
        onClick={(e) => {
          e.stopPropagation();
          copy();
        }}
        className="text-sm text-primary/70 hover:text-primary transition-colors font-black uppercase tracking-widest"
      >
        {copied ? "DONE!" : "COPY"}
      </button>
    </div>
  );
}
