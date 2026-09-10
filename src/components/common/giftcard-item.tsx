'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Trash2, AlertTriangle, EllipsisVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatCurrency, copyToClipboard } from '@/lib/utils';
import { showAlert } from '@/lib/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';
import type { Giftcard } from '@/types';

interface GiftcardItemProps {
  card: Giftcard;
  contextualInfo?: React.ReactNode;
  dropdownActions?: React.ReactNode;
  onViewDetails?: (card: Giftcard) => void;
  onDelete?: (cardId: string) => void;
  showCopyButton?: boolean;
  hasIssues?: boolean;
}

const statusColors: Record<string, string> = {
  UNUSED: 'bg-emerald-500/10 text-emerald-500',
  USED: 'bg-blue-500/10 text-blue-500',
  ALREADY_USED: 'bg-destructive/10 text-destructive',
  INVALID: 'bg-destructive/10 text-destructive',
  DEACTIVATED: 'bg-destructive/10 text-destructive',
  WRONG_AMOUNT: 'bg-amber-500/10 text-amber-500',
};

export function GiftcardItem({
  card,
  contextualInfo,
  dropdownActions,
  onViewDetails,
  onDelete,
  showCopyButton = true,
  hasIssues: hasIssuesProp = false,
}: GiftcardItemProps) {
  const canDelete = !card.orderId && onDelete;
  const canViewDetails = onViewDetails;
  const showIssues = hasIssuesProp;
  const hasDropdownActions = dropdownActions !== undefined;
  const currency = card.country?.currency || 'USD';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        scale: card.isSearchMatch ? [1, 1.05, 1.03] : 1,
      }}
      transition={{
        scale: card.isSearchMatch
          ? {
              duration: 0.5,
              repeat: Infinity,
              repeatType: 'reverse',
            }
          : { duration: 0.2 },
      }}
      className="h-full"
    >
      <Card
        className={`group mb-1 flex h-full flex-col gap-1 overflow-hidden rounded-t-2xl rounded-b-none border-b-0 p-0 shadow-sm transition-all hover:shadow-md ${
          card.isSearchMatch ? 'ring-primary ring-offset-background z-10 shadow-[0_0_30px_var(--primary)] ring-4 ring-offset-4' : ''
        }`}
      >
        {/* TOP HALF: Gift Card Design */}
        <div className="bg-muted/50 relative h-28 w-full shrink-0">
          {card.isSearchMatch && (
            <div className="absolute top-0 right-0 z-50">
              <Badge className="bg-primary animate-pulse rounded-none rounded-bl-lg px-2 py-1 text-[10px] font-black tracking-tighter shadow-lg">
                MATCH
              </Badge>
            </div>
          )}
          {card.brand.image ? (
            <>
              <Image src={card.brand.image} alt={card.brand.name} fill className="object-contain" loading="eager" />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-black/40" />
            </>
          ) : (
            <div className="from-primary/80 to-primary/30 absolute inset-0 bg-linear-to-br" />
          )}

          <div className="absolute inset-0 flex flex-col justify-between p-3">
            <div className="flex w-full items-start justify-between">
              <Badge
                className={`${statusColors[card.status]} border-border/50 bg-background/95 px-2 py-0.5 text-[9px] font-black tracking-widest uppercase shadow-sm backdrop-blur-md`}
              >
                {card.status}
              </Badge>
              <div className="flex items-center gap-1">
                {hasDropdownActions ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="bg-background/40 hover:bg-background/60 size-7 rounded-full shadow-sm backdrop-blur-md hover:text-white"
                      >
                        <EllipsisVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">{dropdownActions}</DropdownMenuContent>
                  </DropdownMenu>
                ) : showIssues ? (
                  <div
                    className="bg-destructive/90 flex h-7 w-7 items-center justify-center rounded-full shadow-sm backdrop-blur-sm"
                    title="Con problemas"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </div>
                ) : null}
                {canDelete && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(card.id);
                    }}
                    variant="ghost"
                    size="icon"
                    className="hover:bg-destructive/90 bg-background/40 h-7 w-7 rounded-full opacity-0 shadow-sm backdrop-blur-md transition-all group-hover:opacity-100 hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                {canViewDetails && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(card);
                    }}
                    variant="ghost"
                    size="icon"
                    className="bg-background/40 h-7 w-7 rounded-full opacity-0 shadow-sm backdrop-blur-md transition-all group-hover:opacity-100 hover:text-white"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex w-full items-end justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-widest text-white/90 uppercase drop-shadow-md">{card.brand.name}</span>
                {card.status === 'WRONG_AMOUNT' && card.reportedAmount != null ? (
                  <div className="flex flex-col">
                    <span className="text-lg leading-none font-black tracking-tight text-white/50 line-through drop-shadow-lg">
                      {formatCurrency(card.amount, { currency })}
                    </span>
                    <span className="text-3xl leading-none font-black tracking-tight drop-shadow-lg">
                      {formatCurrency(card.reportedAmount, { currency })}
                    </span>
                  </div>
                ) : ['ALREADY_USED', 'INVALID', 'DEACTIVATED'].includes(card.status) ? (
                  <span className="text-3xl leading-none font-black tracking-tight text-red-500 line-through drop-shadow-lg">
                    {formatCurrency(card.amount, { currency })}
                  </span>
                ) : (
                  <span className="text-3xl leading-none font-black tracking-tight drop-shadow-lg">
                    {formatCurrency(card.amount, { currency })}
                  </span>
                )}
              </div>
              {!card.brand.image && <span className="text-4xl leading-none text-white/50">{card.brand.icon}</span>}
            </div>
          </div>
        </div>

        {/* BOTTOM HALF: Code & Details */}
        <CardContent className="bg-card flex flex-1 flex-col px-2">
          <ClaimCodeField code={card.claimCode} variant="visible" showCopyButton={showCopyButton} />
        </CardContent>

        {/* CONTEXTUAL INFO SLOT */}
        {contextualInfo}
      </Card>
    </motion.div>
  );
}

// ── ClaimCodeField (single-consumer: solo lo usa GiftcardItem) ─────────────

interface ClaimCodeFieldProps {
  code: string;
  variant?: 'visible' | 'masked';
  showToast?: boolean;
  showCopyButton?: boolean;
}

function ClaimCodeField({ code, variant = 'masked', showToast = true, showCopyButton = true }: ClaimCodeFieldProps) {
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
