'use client';

import { AlertTriangle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import type { GiftcardIssueAlertProps } from '@/components/ui/types';

export const GiftcardIssueAlert = ({ status }: GiftcardIssueAlertProps) => {
  const pathname = usePathname();
  const portal = pathname?.includes('/buy') || pathname?.includes('/admin') ? 'buy' : 'sell';
  const label = status.replace('_', ' ');

  const content = {
    buy: {
      title: 'Acción Requerida',
      description: `ESTA TARJETA FUE REPORTADA COMO ${label}. EL COMPRADOR RECLAMÓ UN PROBLEMA DURANTE LA REDENCIÓN.`,
    },
    sell: {
      title: 'Action Required',
      description: `THIS CARD WAS REPORTED AS ${label}. AN ISSUE WAS CLAIMED DURING REDEMPTION.`,
    },
  };

  const current = content[portal] || content.sell;

  return (
    <div className="border-destructive/20 bg-destructive/10 relative flex gap-4 overflow-hidden rounded-2xl border p-5 italic">
      <div className="bg-destructive/5 absolute top-0 right-0 -mt-12 -mr-12 h-24 w-24 rounded-full blur-2xl" />
      <AlertTriangle className="text-destructive mt-1 h-6 w-6 shrink-0" />
      <div className="space-y-1.5">
        <p className="text-destructive text-sm font-black tracking-widest uppercase">{current.title}</p>
        <p className="text-destructive/80 text-base leading-relaxed font-bold uppercase">{current.description}</p>
      </div>
    </div>
  );
};
