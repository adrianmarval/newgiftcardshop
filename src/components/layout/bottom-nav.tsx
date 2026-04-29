'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion, useDragControls, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { IconChevronUp } from '@tabler/icons-react';

export interface BottomNavItem {
  title: string;
  url?: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}

interface BottomNavProps {
  items: BottomNavItem[];
  className?: string;
  variant?: 'default' | 'compact';
  isFixed?: boolean;
}

export function BottomNav({ items, className, variant = 'default', isFixed = false }: BottomNavProps) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // Safe hydration
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const dragY = useMotionValue(0);
  const springY = useSpring(dragY, { stiffness: 400, damping: 40 });

  const isCompact = variant === 'compact';
  const mainItems = items.slice(0, 5);
  const extraItems = items.slice(5);
  const hasExtra = extraItems.length > 0;

  const baseHeight = 0;
  const rows = Math.ceil(extraItems.length / 4);
  const maxExpansion = Math.min(rows * 65 + 10, 240);

  const drawerHeight = useTransform(springY, [0, -maxExpansion], [baseHeight, maxExpansion]);
  const contentOpacity = useTransform(springY, [0, -40], [0, 1]);

  React.useEffect(() => {
    return dragY.on('change', (v) => {
      if (v < -maxExpansion / 2 && !isExpanded) setIsExpanded(true);
      if (v > -20 && isExpanded) setIsExpanded(false);
    });
  }, [dragY, isExpanded, maxExpansion]);

  const onDragEnd = (_: any, info: any) => {
    if (info.offset.y < -40 || info.velocity.y < -500) {
      dragY.set(-maxExpansion);
      setIsExpanded(true);
    } else {
      dragY.set(0);
      setIsExpanded(false);
    }
  };

  const toggleMenu = () => {
    if (isExpanded) {
      dragY.set(0);
      setIsExpanded(false);
    } else {
      dragY.set(-maxExpansion);
      setIsExpanded(true);
    }
  };

  if (!mounted) return null;

  const handlePan = (_: any, info: { delta: { y: number } }) => {
    const newY = dragY.get() + info.delta.y;
    dragY.set(Math.max(-maxExpansion, Math.min(0, newY)));
  };

  return (
    <motion.nav
      onPan={handlePan}
      onPanEnd={onDragEnd}
      className={cn(
        'p-1 border-border bg-background/95 supports-backdrop-filter:bg-background/95 z-50 backdrop-blur-xl transition-all duration-300',
        'relative touch-none overflow-visible select-none',
        isFixed
          ? 'fixed right-0 bottom-0 left-0 border-t shadow-[0_-2px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-2px_30px_rgba(0,0,0,0.3)]'
          : 'w-full rounded-t-2xl border-x border-t shadow-lg',
        isExpanded ? 'rounded-t-3xl' : '',
        className,
      )}
    >
      {hasExtra && (
        <>
          {/* Floating Handle */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              toggleMenu();
            }}
            className={cn(
              'border-border bg-background absolute -top-3 left-1/2 z-60 flex h-3 w-10 -translate-x-1/2 cursor-grab items-center justify-center rounded-t-lg border-x border-t shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.05)] active:cursor-grabbing',
            )}
          >
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="text-primary/60 hover:text-primary transition-colors"
            >
              <IconChevronUp size={18} stroke={2.5} />
            </motion.div>
          </div>

          {/* Expandable Content Container */}
          <motion.div style={{ height: drawerHeight }} className="overflow-hidden">
            <motion.div style={{ opacity: contentOpacity }} className="grid grid-cols-4 gap-2 px-1 pt-2 pb-2">
              {extraItems.map((item, idx) => (
                <NavItem key={idx} item={item} isActive={pathname === item.url} isCompact={false} />
              ))}
            </motion.div>

            {isExpanded && <div className="border-t border-dashed py-0.5 opacity-50" />}
          </motion.div>
        </>
      )}

      {/* Main Bar */}
      <div className={cn('flex h-14 items-center justify-around', isCompact ? 'px-0.5 md:px-1' : 'px-1')}>
        {mainItems.map((item, idx) => (
          <NavItem key={idx} item={item} isActive={pathname === item.url} isCompact={false} />
        ))}
      </div>
    </motion.nav>
  );
}

function NavItem({ item, isActive, isCompact }: { item: BottomNavItem; isActive: boolean; isCompact: boolean }) {
  const Content = (
    <>
      <item.icon className={cn('h-6 w-6', isActive && 'fill-primary/20')} />
      <span className={cn('text-[10px] md:text-sm', 'font-semibold tracking-tight', isActive ? 'text-primary' : '')}>{item.title}</span>
    </>
  );

  const baseClasses = cn(
    'flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all duration-200 w-full',
    'px-2 py-1.5',
    isActive ? 'bg-primary/10 text-primary border-primary/10 border' : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
  );

  if (item.onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          item.onClick?.();
        }}
        className={baseClasses}
      >
        {Content}
      </button>
    );
  }

  return (
    <Link href={item.url || '#'} className={baseClasses} onClick={(e) => e.stopPropagation()}>
      {Content}
    </Link>
  );
}
