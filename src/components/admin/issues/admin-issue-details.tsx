'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAction } from 'next-safe-action/hooks';
import { ExternalLink, ImageIcon, Loader2, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GiftcardItem, UserBadge, CopyableId } from '@/components/common';
import { getIssueProof } from '@/actions/admin/issues';
import { showAlert } from '@/lib/ui';
import { giftcardIssueTypeConfig } from '@/lib/config';
import { formatCurrency } from '@/lib/utils';
import type { AdminGiftcardIssue } from '@/types';

interface AdminIssueDetailsProps {
  issue: AdminGiftcardIssue;
}

export function AdminIssueDetails({ issue }: AdminIssueDetailsProps) {
  const [proofOpen, setProofOpen] = useState(false);
  const [proof, setProof] = useState<{ mimeType: string; base64: string } | null>(null);

  const { execute: fetchProof, status: proofStatus } = useAction(getIssueProof, {
    onSuccess: ({ data }) => {
      if (data?.success && data.proof) {
        setProof(data.proof);
        setProofOpen(true);
      } else {
        showAlert.toast.info('Soporte no disponible', 'No se pudo obtener la imagen del soporte desde Telegram.');
      }
    },
    onError: ({ error }) => {
      showAlert.error('Error', error.serverError || 'No se pudo cargar el soporte.');
    },
  });

  const currency = issue.giftcard.country?.currency || 'USD';
  const typeConfig = giftcardIssueTypeConfig[issue.issueType];
  const isLoadingProof = proofStatus === 'executing';

  return (
    <div className="space-y-3">
      {/* Header: order + issue summary + proof trigger */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs md:text-sm">
          <CopyableId id={issue.order.id} prefix="Orden #" />
          <Link
            href={`/admin/dashboard/orders?search=${issue.order.id}`}
            className="text-primary flex items-center gap-0.5 hover:underline"
          >
            Ver orden
            <ExternalLink className="h-3 w-3" />
          </Link>
          <span>
            Tipo: <span className="text-foreground font-medium">{typeConfig.label}</span>
          </span>
          {issue.issueType === 'WRONG_AMOUNT' && issue.reportedAmount != null && (
            <span>
              Monto reportado:{' '}
              <span className="font-medium text-amber-500">{formatCurrency(issue.reportedAmount, { currency })}</span>
              <span className="text-muted-foreground/70"> (original: {formatCurrency(issue.giftcard.amount, { currency })})</span>
            </span>
          )}
        </div>

        {issue.hasProof ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={isLoadingProof}
            onClick={() => fetchProof({ issueId: issue.id })}
          >
            {isLoadingProof ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
            {isLoadingProof ? 'Cargando...' : 'Ver soporte'}
          </Button>
        ) : (
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <ImageOff className="h-3.5 w-3.5" />
            Sin soporte adjunto
          </span>
        )}
      </div>

      {/* Reported card */}
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <GiftcardItem
          card={issue.giftcard}
          hasIssues
          contextualInfo={
            issue.seller ? (
              <CardFooter className="bg-muted/30 mt-auto flex items-center justify-between border-t p-1 px-3">
                <UserBadge user={issue.seller} size="xs" className="min-w-0 flex-1" />
                <span className="text-muted-foreground ml-2 shrink-0 text-[9px] font-bold tracking-widest uppercase">Vendedor</span>
              </CardFooter>
            ) : undefined
          }
        />
      </div>

      {/* Proof dialog */}
      <Dialog open={proofOpen} onOpenChange={setProofOpen}>
        <DialogContent className="border-border bg-card flex max-h-[90vh] max-w-[95vw] flex-col overflow-hidden p-0 md:max-w-3xl">
          <DialogHeader className="border-b p-6 pb-2">
            <DialogTitle>Soporte del reporte</DialogTitle>
            <DialogDescription>
              Captura adjunta por {issue.buyer.name} · {typeConfig.label}
            </DialogDescription>
          </DialogHeader>
          <div className="custom-scrollbar flex flex-1 items-center justify-center overflow-y-auto bg-black/80 p-4">
            {proof && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:${proof.mimeType};base64,${proof.base64}`}
                alt="Soporte del reporte"
                className="max-h-full max-w-full object-contain shadow-2xl"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
