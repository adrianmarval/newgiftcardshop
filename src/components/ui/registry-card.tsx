'use client';

import { ReactNode, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { formatDateTime } from '@/lib/date-formatter';

export interface RegistryCardProps {
  id: string | number;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  topRightContent?: ReactNode;
  date?: Date | string | ReactNode;
  isExpanded: boolean;
  isHighlighted?: boolean;
  onToggle: () => void;
  hasReport?: boolean;
  progress?: {
    percentage: number;
    colorClass: string;
    fullColorClass?: string;
  };
  activeBgClass?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function RegistryCard({
  id,
  title,
  subtitle,
  icon,
  topRightContent,
  date,
  isExpanded,
  isHighlighted,
  onToggle,
  hasReport,
  progress,
  activeBgClass,
  actions,
  children,
  className = '',
}: RegistryCardProps) {
  return (
    <Card
      id={`registry-card-${id}`}
      onClick={onToggle}
      className={`hover:border-primary/30 relative cursor-pointer scroll-mt-2 gap-1 overflow-hidden border py-2 transition-all duration-200 ease-out ${
        isExpanded || isHighlighted ? `${activeBgClass || 'bg-primary/10 dark:bg-primary/15'} shadow-sm` : ''
      } ${isHighlighted ? 'border-primary/50 ring-primary/20 ring-1' : ''} ${className}`}
    >
      {hasReport && !isExpanded && (
        <div className="text-muted-foreground/80 absolute right-1 bottom-4 z-20 flex items-center justify-center gap-1 text-[10px] font-black tracking-widest uppercase">
          <AlertTriangle className="text-destructive fill-destructive/20 h-4 w-4 drop-shadow-md" />
          <span>With Reports</span>
        </div>
      )}

      <CardHeader className="px-2">
        <CardTitle className="text-inherit">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 md:gap-4">
            {icon && <div className="flex h-10 w-10 shrink-0 items-center justify-center">{icon}</div>}

            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="text-md text-foreground truncate font-medium md:text-base">{title}</div>
              {subtitle && <div className="text-muted-foreground truncate text-xs md:text-sm">{subtitle}</div>}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-0.5">{topRightContent}</div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          {date && <span className="text-muted-foreground text-sm">{date instanceof Date ? formatDateTime(date, 'es-AR') : date}</span>}
        </div>
        <ChevronDown className={`text-muted-foreground h-5 w-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </CardContent>

      {/* Progress Bar */}
      {progress && (
        <div className="bg-muted flex h-1 overflow-hidden">
          {progress.fullColorClass ? (
            <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className={`h-full ${progress.fullColorClass}`} />
          ) : (
            <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className={`h-full ${progress.colorClass}`} />
          )}
        </div>
      )}

      {/* Action Slot */}
      {actions && <CardFooter className="p-1">{actions}</CardFooter>}

      {/* Expansion Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="border-border cursor-default border-t p-4" onClick={(e: MouseEvent) => e.stopPropagation()}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
