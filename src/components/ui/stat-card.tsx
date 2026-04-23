'use client';

import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  color?: string;
}

export function StatCard({ label, value, description, icon, color }: StatCardProps) {
  return (
    <div className="border-border bg-card rounded-xl border p-1 shadow-sm">
      <div className="flex items-center gap-2">
        {icon && <div className={color ?? 'text-primary'}>{icon}</div>}
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[10px] font-medium uppercase md:text-xs">{label}</span>
          <span className={`text-xl font-semibold md:text-2xl ${color ?? 'text-foreground'}`}>{value}</span>
        </div>
      </div>
      {description && <span className="text-muted-foreground text-[10px] md:text-xs">{description}</span>}
    </div>
  );
}
