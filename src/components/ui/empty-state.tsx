'use client';

import { History } from 'lucide-react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const EmptyState = ({ icon, title, description }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 pt-24 pb-24 text-center">
      <div className="bg-muted/20 flex h-24 w-24 items-center justify-center rounded-full">
        {icon || <History className="text-muted-foreground/20 h-12 w-12" />}
      </div>
      <div className="max-w-sm space-y-1.5">
        <h3 className="text-3xl font-black tracking-tight uppercase italic">{title}</h3>
        <p className="text-muted-foreground px-10 text-sm leading-relaxed font-bold tracking-widest uppercase">{description}</p>
      </div>
    </div>
  );
};
