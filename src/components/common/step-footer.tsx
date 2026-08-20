'use client';

import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/ui';

interface StepFooterProps {
  ctaLabel: string;
  ctaLoading?: boolean;
  ctaDisabled?: boolean;
  onContinue: () => void;
  back?: { label: string; onClick: () => void; disabled?: boolean };
  hotkeyHint?: '⏎' | '⌘⏎';
  className?: string;
}

export function StepFooter({
  ctaLabel,
  ctaLoading = false,
  ctaDisabled = false,
  onContinue,
  back,
  hotkeyHint = '⏎',
  className,
}: StepFooterProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {back && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={back.onClick}
          disabled={back.disabled}
          className="h-9 text-xs font-bold md:h-10 md:text-sm"
        >
          {back.label}
        </Button>
      )}

      <Button
        type="button"
        onClick={onContinue}
        disabled={ctaDisabled || ctaLoading}
        className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-9 items-center gap-1 text-xs font-bold md:h-10 md:text-sm"
      >
        {ctaLoading ? (
          <Spinner size="sm" className="h-3.5 w-3.5" />
        ) : (
          <>
            {ctaLabel}
            <kbd className="bg-primary-foreground/20 text-primary-foreground/70 ml-1 rounded px-1 py-0.5 font-mono text-[10px]">
              {hotkeyHint}
            </kbd>
            <ChevronRight className="h-4" />
          </>
        )}
      </Button>
    </div>
  );
}
