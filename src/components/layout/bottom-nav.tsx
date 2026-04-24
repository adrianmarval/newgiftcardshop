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
  variant?: 'default' | 'compact';
  isFixed?: boolean;
}

export function BottomNav({ items, showThemeToggle = true, className, variant = 'default', isFixed = false }: BottomNavProps) {
  const pathname = usePathname();

  const isCompact = variant === 'compact';

  return (
    <nav
      className={cn(
        'border-border bg-background/95 supports-backdrop-filter:bg-background/95 z-50 backdrop-blur-xl',
        isFixed
          ? 'fixed right-0 bottom-0 left-0 border-t shadow-[0_-2px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-2px_30px_rgba(0,0,0,0.3)]'
          : 'w-full rounded-xl border shadow-lg',
        className,
      )}
    >
      <div className={cn('flex h-16 items-center justify-around', isCompact ? 'px-0.5 md:px-1' : 'px-1')}>
        {items.map((item) => {
          const isActive = pathname === item.url;
          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-200',
                isCompact ? 'px-1 py-1 md:px-3 md:py-2' : 'px-3 py-2',
                isActive
                  ? 'bg-primary/10 text-primary border-primary/20 border shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              )}
            >
              <item.icon className={cn(isCompact ? 'h-4 w-4 md:h-5 md:w-5' : 'h-5 w-5', isActive && 'fill-primary/20')} />
              <span
                className={cn(
                  isCompact ? 'text-[9px] md:text-sm' : 'text-[10px] md:text-sm',
                  'font-semibold tracking-tight',
                  isActive ? 'text-primary' : '',
                )}
              >
                {item.title}
              </span>
            </Link>
          );
        })}
        {showThemeToggle && (
          <div
            className={cn(
              'text-muted-foreground hover:bg-muted/80 hover:text-foreground flex flex-col items-center justify-center gap-0.5 rounded-xl',
              isCompact ? 'px-1 py-1 md:px-3 md:py-2' : 'px-3 py-2',
            )}
          >
            <ThemeToggle />
            <span className={cn(isCompact ? 'text-[9px] md:text-sm' : 'text-[10px] md:text-sm', 'font-semibold tracking-tight')}>Tema</span>
          </div>
        )}
      </div>
    </nav>
  );
}
