'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export interface BottomNavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface BottomNavProps {
  items: BottomNavItem[];
  showThemeToggle?: boolean;
  className?: string;
}

export function BottomNav({ items, showThemeToggle = true, className }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'border-border bg-background/95 supports-backdrop-filter:bg-background/95 fixed right-0 bottom-0 left-0 z-50 border-t shadow-[0_-2px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:shadow-[0_-2px_30px_rgba(0,0,0,0.3)]',
        className,
      )}
    >
      <div className="flex h-16 items-center justify-around px-1">
        {items.map((item) => {
          const isActive = pathname === item.url;
          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary border-primary/20 border shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'fill-primary/20')} />
              <span className={cn('text-[10px] font-semibold tracking-wide', isActive ? 'text-primary' : '')}>{item.title}</span>
            </Link>
          );
        })}
        {showThemeToggle && (
          <div className="text-muted-foreground hover:bg-muted/80 hover:text-foreground flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2">
            <ThemeToggle />
            <span className="text-[10px] font-semibold tracking-wide">Tema</span>
          </div>
        )}
      </div>
    </nav>
  );
}
