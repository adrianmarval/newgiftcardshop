'use client';

import { Card } from '@/components/ui/card';
import type { MetricCardGridProps } from '@/components/ui/types';

export const MetricCardGrid = ({ items }: MetricCardGridProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => (
        <Card
          key={index}
          className={`group border-border bg-card/50 hover:border-primary/50 space-y-2 p-6 backdrop-blur-sm transition-all ${
            item.color ? `hover:border-${item.color}/50` : ''
          }`}
        >
          <div className="text-muted-foreground flex items-center justify-between">
            <span className="text-sm font-black tracking-widest uppercase">{item.label}</span>
            <div className={item.color ? `text-${item.color}` : 'text-primary'}>{item.icon}</div>
          </div>
          <div className="text-4xl font-black tracking-tighter italic">{item.value}</div>
          <p className="text-muted-foreground text-sm italic">{item.description}</p>
        </Card>
      ))}
    </div>
  );
};
