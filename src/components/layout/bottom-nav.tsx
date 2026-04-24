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
  const dragControls = useDragControls();
  
  // Safe hydration
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const dragY = useMotionValue(0);
  const springY = useSpring(dragY, { stiffness: 400, damping: 40 });
  
  const isCompact = variant === 'compact';
  const mainItems = items.slice(0, 4);
  const extraItems = items.slice(4);
  const hasExtra = extraItems.length > 0;

  const baseHeight = 28;
  const maxExpansion = Math.min(extraItems.length * 50 + 40, 220);
  
  // Height is the only thing we animate
  const drawerHeight = useTransform(springY, [0, -maxExpansion], [baseHeight, baseHeight + maxExpansion]);
  const contentOpacity = useTransform(springY, [0, -60], [0, 1]);

  React.useEffect(() => {
    return dragY.onChange((v) => {
      if (v < -maxExpansion / 2 && !isExpanded) setIsExpanded(true);
      if (v > -20 && isExpanded) setIsExpanded(false);
    });
  }, [dragY, isExpanded, maxExpansion]);

  const onDragEnd = (_: any, info: any) => {
    if (info.offset.y < -50 || info.velocity.y < -500) {
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

  return (
    <nav
      className={cn(
        'border-border bg-background/95 supports-backdrop-filter:bg-background/95 z-50 backdrop-blur-xl transition-colors duration-300',
        'touch-none select-none',
        isFixed
          ? 'fixed right-0 bottom-0 left-0 border-t shadow-[0_-2px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-2px_30px_rgba(0,0,0,0.3)]'
          : 'w-full rounded-t-2xl border-x border-t shadow-lg',
        isExpanded ? 'rounded-t-3xl' : '',
        className,
      )}
    >
      {hasExtra && (
        <motion.div
          style={{ height: drawerHeight }}
          className="overflow-hidden"
        >
          {/* Handle Area - Use onPan for direct height control without Y offset issues */}
          <motion.div
            onPan={(_, info) => {
              const newY = dragY.get() + info.delta.y;
              dragY.set(Math.max(-maxExpansion, Math.min(0, newY)));
            }}
            onPanEnd={onDragEnd}
            onClick={toggleMenu}
            className="flex h-6 cursor-grab items-center justify-center active:cursor-grabbing"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="text-primary/50 hover:text-primary transition-colors"
            >
              <IconChevronUp size={24} stroke={3} />
            </motion.div>
          </motion.div>

          <motion.div
            style={{ opacity: contentOpacity }}
            className="grid grid-cols-4 gap-4 p-4 pt-0"
          >
            {extraItems.map((item, idx) => (
              <NavItem key={idx} item={item} isActive={pathname === item.url} isCompact={isCompact} />
            ))}
          </motion.div>
          
          {isExpanded && <div className="border-t border-dashed py-1 opacity-50" />}
        </motion.div>
      )}

      {/* Fixed Main Bar */}
      <div className={cn('flex h-16 items-center justify-around', isCompact ? 'px-0.5 md:px-1' : 'px-1')}>
        {mainItems.map((item, idx) => (
          <NavItem key={idx} item={item} isActive={pathname === item.url} isCompact={isCompact} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  item,
  isActive,
  isCompact,
}: {
  item: BottomNavItem;
  isActive: boolean;
  isCompact: boolean;
}) {
  const Content = (
    <>
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
    </>
  );

  const baseClasses = cn(
    'flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-200 w-full',
    isCompact ? 'px-1 py-1 md:px-3 md:py-2' : 'px-3 py-2',
    isActive
      ? 'bg-primary/10 text-primary border-primary/20 border shadow-sm'
      : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
  );

  if (item.onClick) {
    return (
      <button type="button" onClick={item.onClick} className={baseClasses}>
        {Content}
      </button>
    );
  }

  return (
    <Link href={item.url || '#'} className={baseClasses}>
      {Content}
    </Link>
  );
}
