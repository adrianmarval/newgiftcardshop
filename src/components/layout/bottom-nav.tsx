'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { IconDots, IconX } from '@tabler/icons-react';

export interface BottomNavItem {
  title: string;
  url?: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}

interface BottomNavProps {
  items: BottomNavItem[];
  className?: string;
}

export function BottomNav({ items, className }: BottomNavProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // En mobile limitamos a 5 items (4 + botón "Más")
  const limit = 5;
  const hasMore = items.length > limit;
  const mainItems = hasMore ? items.slice(0, limit - 1) : items;
  const extraItems = hasMore ? items.slice(limit - 1) : [];

  return (
    <div className={cn(className)}>
      {/* Menú "Más" para Mobile */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
          >
            {extraItems.map((item, idx) => (
              <NavItem key={idx} item={item} isActive={pathname === item.url} onAction={() => setIsMenuOpen(false)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        className={cn(
          'flex items-center backdrop-blur-xl transition-all duration-300',
          // Mobile: Barra flotante redondeada y más sustancial
          'w-full justify-between rounded-[2.5rem]',
          // Desktop: Dock lateral vertical
          'lg:h-auto lg:w-20 lg:flex-col lg:gap-5 lg:rounded-3xl lg:py-6',
        )}
      >
        {/* En Mobile mostramos los principales + botón Más */}
        {mainItems.map((item, idx) => (
          <NavItem key={idx} item={item} isActive={pathname === item.url} />
        ))}

        {hasMore && (
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl p-2 transition-all duration-200 lg:hidden',
              isMenuOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/80',
            )}
          >
            <motion.div animate={{ rotate: isMenuOpen ? 90 : 0 }}>
              {isMenuOpen ? <IconX className="h-7 w-7" /> : <IconDots className="h-7 w-7" />}
            </motion.div>
            <span className="text-[10px] font-medium">Más</span>
          </button>
        )}

        {/* En Desktop mostramos todos los items de una */}
        <div className="hidden lg:flex lg:flex-col lg:gap-5">
          {extraItems.map((item, idx) => (
            <NavItem key={`extra-${idx}`} item={item} isActive={pathname === item.url} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavItem({ item, isActive, onAction }: { item: BottomNavItem; isActive: boolean; onAction?: () => void }) {
  const Component = item.onClick ? 'button' : Link;
  const props = item.onClick
    ? {
        onClick: () => {
          item.onClick?.();
          onAction?.();
        },
        type: 'button' as const,
      }
    : { href: item.url || '#', onClick: onAction };

  return (
    <Component
      {...(props as any)}
      className={cn(
        'group relative flex w-full flex-1 flex-col items-center justify-center gap-1 rounded-2xl p-2 transition-all duration-200 lg:w-auto lg:max-w-none lg:flex-none',
        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
      )}
    >
      <item.icon className={cn('h-7 w-7 transition-all duration-300', isActive ? 'text-primary scale-110' : 'group-hover:scale-110')} />

      <span
        className={cn(
          'w-full truncate px-0.5 text-center text-[10px] font-semibold transition-colors duration-200 lg:text-xs',
          isActive ? 'text-primary font-bold' : 'text-muted-foreground group-hover:text-foreground',
        )}
      >
        {item.title}
      </span>

      {isActive && (
        <motion.div
          layoutId="nav-active"
          className="bg-primary absolute bottom-0 h-1.5 w-6 rounded-full lg:bottom-auto lg:left-0 lg:h-8 lg:w-1.5"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
    </Component>
  );
}
