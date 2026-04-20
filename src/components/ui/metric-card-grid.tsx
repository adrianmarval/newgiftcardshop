'use client';

import { Card } from '@/components/ui/card';
import type { MetricCardGridProps } from '@/components/ui/types';

export const MetricCardGrid = ({ items }: MetricCardGridProps) => {
  return (
    <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4 md:gap-4">
      {items.map((item, index) => (
        <Card
          key={index}
          className={`group border-border bg-card/50 hover:border-primary/50 flex items-center justify-between p-2 md:block md:space-y-1 md:p-4 ${
            item.color ? `hover:border-${item.color}/50` : ''
          }`}
        >
          <div className="flex items-center gap-2 md:block">
            <div className={`shrink-0 md:mb-1 ${item.color ? `text-${item.color}` : 'text-primary'}`}>{item.icon}</div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-[10px] font-medium uppercase md:text-xs">{item.label}</span>
              <span className="text-sm font-semibold md:text-2xl md:font-black">{item.value}</span>
            </div>
          </div>
          <p className="text-muted-foreground hidden text-[9px] italic md:block md:text-xs">{item.description}</p>
        </Card>
      ))}
    </div>
  );
};
