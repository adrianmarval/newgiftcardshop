"use client";

import { AlertTriangle } from "lucide-react";
import type { GiftcardIssueAlertProps } from "@/types";

export function GiftcardIssueAlert({ status }: GiftcardIssueAlertProps) {
  const label = status.replace("_", " ");

  return (
    <div className="p-5 bg-destructive/10 border border-destructive/20 rounded-2xl flex gap-4 italic relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/5 rounded-full -mr-12 -mt-12 blur-2xl" />
      <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-1" />
      <div className="space-y-1.5">
        <p className="text-base text-destructive/80 font-bold leading-relaxed uppercase">
          THIS CARD WAS REPORTED AS <span className="underline">{label}</span>. AN ISSUE WAS CLAIMED DURING REDEMPTION.
        </p>
      </div>
    </div>
  );
}
