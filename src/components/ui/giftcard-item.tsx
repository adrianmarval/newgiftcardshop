'use client';

import { motion } from 'framer-motion';
import { Eye, Trash2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ClaimCodeField } from '@/components/ui/claim-code-field';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import type { Giftcard } from '@/types/domain/giftcard';

interface GiftcardItemProps {
  card: Giftcard;
  contextualInfo?: React.ReactNode;
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
  onViewDetails,
  onDelete,
  showCopyButton = true,
  hasIssues: hasIssuesProp = false,
}: GiftcardItemProps) {
  const canDelete = !card.orderId && onDelete;
  const canViewDetails = onViewDetails;
  const showIssues = hasIssuesProp;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
      <Card className="group mb-1 flex h-full flex-col gap-1 overflow-hidden rounded-t-2xl rounded-b-none border-b-0 p-0 shadow-sm transition-all hover:shadow-md">
        {/* TOP HALF: Gift Card Design */}
        <div className="bg-muted/50 relative h-28 w-full shrink-0">
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
                {showIssues && (
                  <div
                    className="bg-destructive/90 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm backdrop-blur-sm"
                    title="Con problemas"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </div>
                )}
                {canDelete && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(card.id);
                    }}
                    variant="ghost"
                    size="icon"
                    className="hover:bg-destructive/90 bg-background/40 h-7 w-7 rounded-full text-white opacity-0 shadow-sm backdrop-blur-md transition-all group-hover:opacity-100 hover:text-white"
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
                    className="bg-background/40 h-7 w-7 rounded-full text-white opacity-0 shadow-sm backdrop-blur-md transition-all group-hover:opacity-100 hover:text-white"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex w-full items-end justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-widest text-white/90 uppercase drop-shadow-md">{card.brand.name}</span>
                <CardFooter className="p-0 text-3xl leading-none font-black tracking-tight text-white drop-shadow-lg">
                  ${card.amount.toFixed(2)}
                </CardFooter>
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
