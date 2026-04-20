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
    <div className="mt-3 flex flex-col gap-1.5 md:mt-4">
      <div className="flex items-center gap-2">
        <CreditCard className="h-3 w-3 text-emerald-500 md:h-4 md:w-4" />
        <span className="text-muted-foreground text-[10px] font-medium uppercase md:text-xs">{isSpanish ? 'Pagos' : 'Payments'}:</span>
      </div>
      <div className="flex flex-wrap gap-1.5 md:gap-2">
        {payments.map((p) => (
          <div key={p.id} className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5">
            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 md:h-3 md:w-3" />
            <span className="font-mono text-[10px] font-medium text-emerald-500 md:text-xs">{p.id.toUpperCase()}</span>
            <span className="text-[10px] text-emerald-500/70 md:text-xs">+${p.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
