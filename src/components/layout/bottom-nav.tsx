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
        'bg-background/95 supports-backdrop-filter:bg-background/60 fixed right-0 bottom-0 left-0 z-50 border-t backdrop-blur',
        className,
      )}
    >
      <div className="flex h-16 items-center justify-around px-2">
        {items.map((item) => {
          const isActive = pathname === item.url;
          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'fill-primary/20')} />
              <span className="text-[10px] font-medium">{item.title}</span>
            </Link>
          );
        })}
        {showThemeToggle && (
          <div className="flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2">
            <ThemeToggle />
          </div>
        )}
      </div>
    </nav>
  );
}
