'use client';

import { usePathname } from 'next/navigation';
import { CreditCard, CheckCircle2 } from 'lucide-react';
import type { TransactionListProps } from '@/components/ui/types';

export const TransactionList = ({ payments }: TransactionListProps) => {
  const pathname = usePathname();
  const isSpanish = pathname?.includes('/buy') || pathname?.includes('/admin');

  if (payments.length === 0) {
    return null;
  }

  return (
    <div className="relative mt-8 overflow-hidden rounded-3xl border border-emerald-500/10 bg-emerald-500/5 p-6">
      <div className="absolute top-0 right-0 -mt-16 -mr-16 h-32 w-32 rounded-full bg-emerald-500/5 blur-3xl" />
      <h4 className="mb-4 inline-flex items-center gap-2 text-sm font-black tracking-[0.2em] text-emerald-500 uppercase">
        <CreditCard className="h-3 w-3" /> {isSpanish ? 'Información de Pago' : 'Payment Information'}
      </h4>
      <div className="space-y-2.5">
        {payments.map((p) => (
          <div
            key={p.id}
            className="bg-background/50 flex items-center justify-between rounded-xl border border-emerald-500/10 px-2 py-2 text-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-foreground font-mono font-black tracking-tighter uppercase">
                  TRX ID: {p.id.slice(-8).toUpperCase()}
                </span>
                <span className="text-muted-foreground text-sm font-bold">{new Date(p.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="text-xl font-black text-emerald-500 italic">+${p.amount.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
