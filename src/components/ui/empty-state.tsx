"use client";

import { History } from "lucide-react";
import type { EmptyStateProps } from "@/types";

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="pt-24 pb-24 flex flex-col items-center justify-center text-center space-y-6">
      <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center">
        {icon || <History className="w-12 h-12 text-muted-foreground/20" />}
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-3xl font-black italic tracking-tight uppercase">{title}</h3>
        <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest leading-relaxed px-10">
          {description}
        </p>
      </div>
    </div>
  );
}
