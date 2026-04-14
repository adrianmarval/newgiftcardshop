"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Package, XCircle, AlertTriangle } from "lucide-react";
import { usePathname } from "next/navigation";
import type { GiftcardStatusBadgeProps } from "@/types";

const reportLabels: Record<string, Record<string, string>> = {
  buy: {
    INVALID: "Inválida",
    ALREADY_USED: "Ya Usada",
    DEACTIVATED: "Desactivada",
    WRONG_AMOUNT: "Monto Incorrecto",
    UNUSED: "Sin Usar",
    USED: "Usada",
  },
  sell: {
    INVALID: "Invalid",
    ALREADY_USED: "Already Used",
    DEACTIVATED: "Deactivated",
    WRONG_AMOUNT: "Wrong Amount",
    UNUSED: "Unused",
    USED: "Used",
  },
};

export function GiftcardStatusBadge({ card, orderStatus }: GiftcardStatusBadgeProps) {
  const pathname = usePathname();
  const portal = (pathname?.includes("/buy") || pathname?.includes("/admin")) ? "buy" : "sell";
  const labels = reportLabels[portal] || reportLabels.sell;

  // Cancelled order takes precedence
  if (orderStatus === "CANCELLED") {
    return (
      <Badge className="bg-muted text-muted-foreground hover:bg-muted border-border gap-1.5 font-bold uppercase tracking-tight">
        <XCircle className="w-3 h-3" /> {portal === "buy" ? "Cancelada" : "Cancelled"}
      </Badge>
    );
  }

  // Confirmed cards show their status
  if (card.isConfirmed) {
    if (card.status === "USED") {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/30 gap-1.5 font-bold uppercase tracking-tight">
          <CheckCircle2 className="w-3 h-3" /> {portal === "buy" ? "Confirmada" : "Confirmed"}
        </Badge>
      );
    }

    const label = labels[card.status] || card.status.replace("_", " ");
    const isWrongAmount = card.status === "WRONG_AMOUNT";

    return (
      <Badge
        className={`${isWrongAmount ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/20 border-amber-500/30" : "bg-destructive/20 text-destructive hover:bg-destructive/20 border-destructive/30"} gap-1.5 font-bold uppercase tracking-tight`}
      >
        <AlertTriangle className="w-3 h-3" /> {label}
      </Badge>
    );
  }

  // Card has an orderId but not confirmed yet = Taken (Pending)
  if (card.orderId) {
    return (
      <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/20 border-blue-500/30 animate-pulse gap-1.5 font-bold uppercase tracking-tight">
        <Clock className="w-3 h-3" /> {portal === "buy" ? "En Proceso" : "Taken (Pending)"}
      </Badge>
    );
  }

  // Available
  return (
    <Badge className="bg-muted text-muted-foreground hover:bg-muted border-border gap-1.5 font-bold uppercase tracking-tight">
      <Package className="w-3 h-3" /> {portal === "buy" ? "Disponible" : "Available"}
    </Badge>
  );
}