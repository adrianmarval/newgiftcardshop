"use client";

import { Card } from "@/components/ui/card";
import type { StatsItem as StatsItemType } from "@/types";

interface MetricCardGridProps {
  items: StatsItemType[];
}

export function MetricCardGrid({ items }: MetricCardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, index) => (
        <Card
          key={index}
          className={`p-6 bg-card/50 backdrop-blur-sm border-border space-y-2 group hover:border-primary/50 transition-all ${
            item.color ? `hover:border-${item.color}/50` : ""
          }`}
        >
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-sm font-black uppercase tracking-widest">{item.label}</span>
            <div className={item.color ? `text-${item.color}` : "text-primary"}>{item.icon}</div>
          </div>
          <div className="text-4xl font-black italic tracking-tighter">{item.value}</div>
          <p className="text-sm text-muted-foreground italic">{item.description}</p>
        </Card>
      ))}
    </div>
  );
}
