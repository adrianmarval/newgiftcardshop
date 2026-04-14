"use client";

import { AlertTriangle } from "lucide-react";
import { usePathname } from "next/navigation";
import type { GiftcardIssueAlertProps } from "@/types";

export function GiftcardIssueAlert({ status }: GiftcardIssueAlertProps) {
  const pathname = usePathname();
  const portal = (pathname?.includes("/buy") || pathname?.includes("/admin")) ? "buy" : "sell";
  const label = status.replace("_", " ");

  const content = {
    buy: {
      title: "Acción Requerida",
      description: `ESTA TARJETA FUE REPORTADA COMO ${label}. EL COMPRADOR RECLAMÓ UN PROBLEMA DURANTE LA REDENCIÓN.`,
    },
    sell: {
      title: "Action Required",
      description: `THIS CARD WAS REPORTED AS ${label}. AN ISSUE WAS CLAIMED DURING REDEMPTION.`,
    },
  };

  const current = content[portal] || content.sell;

  return (
    <div className="p-5 bg-destructive/10 border border-destructive/20 rounded-2xl flex gap-4 italic relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/5 rounded-full -mr-12 -mt-12 blur-2xl" />
      <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-1" />
      <div className="space-y-1.5">
        <p className="text-sm font-black text-destructive uppercase tracking-widest">{current.title}</p>
        <p className="text-base text-destructive/80 font-bold leading-relaxed uppercase">
          {current.description}
        </p>
      </div>
    </div>
  );
}
