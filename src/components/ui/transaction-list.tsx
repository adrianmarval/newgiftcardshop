"use client";

import { usePathname } from "next/navigation";
import { CreditCard, CheckCircle2 } from "lucide-react";
import type { TransactionListProps } from "@/types";

export function TransactionList({ payments }: TransactionListProps) {
  const pathname = usePathname();
  const isSpanish = pathname?.includes("/buy") || pathname?.includes("/admin");

  if (payments.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
      <h4 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-500 mb-4 inline-flex items-center gap-2">
        <CreditCard className="w-3 h-3" /> {isSpanish ? "Información de Pago" : "Payment Information"}
      </h4>
      <div className="space-y-2.5">
        {payments.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between text-sm px-2 py-2 bg-background/50 rounded-xl border border-emerald-500/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              </div>
              <div className="flex flex-col">
                <span className="font-mono font-black text-foreground uppercase tracking-tighter">
                  TRX ID: {p.id.slice(-8).toUpperCase()}
                </span>
                <span className="text-sm text-muted-foreground font-bold">
                  {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="text-xl font-black text-emerald-500 italic">+${p.amount.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
