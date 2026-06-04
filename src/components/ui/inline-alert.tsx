'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export type InlineAlertVariant = 'success' | 'error' | 'warning' | 'info';

export interface InlineAlertProps {
  variant: InlineAlertVariant;
  title: string;
  description?: string;
  className?: string;
  autoDismiss?: boolean;
  dismissAfter?: number;
  onDismiss?: () => void;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: {
    container: 'border-emerald-500/30 bg-emerald-500/10',
    icon: 'text-emerald-500',
    title: 'text-emerald-500',
    description: 'text-emerald-500/80',
  },
  error: {
    container: 'border-destructive/30 bg-destructive/10',
    icon: 'text-destructive',
    title: 'text-destructive',
    description: 'text-destructive/80',
  },
  warning: {
    container: 'border-yellow-500/30 bg-yellow-500/10',
    icon: 'text-yellow-500',
    title: 'text-yellow-500',
    description: 'text-yellow-500/80',
  },
  info: {
    container: 'border-primary/30 bg-primary/10',
    icon: 'text-primary',
    title: 'text-primary',
    description: 'text-primary/80',
  },
};

export function InlineAlert({
  variant,
  title,
  description,
  className,
  autoDismiss = false,
  dismissAfter = 4000,
  onDismiss,
}: InlineAlertProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
  }, [title]);

  useEffect(() => {
    if (!autoDismiss) return;
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss?.(), 200);
    }, dismissAfter);
    return () => clearTimeout(timer);
  }, [autoDismiss, dismissAfter, onDismiss]);

  const Icon = icons[variant];
  const variantStyles = styles[variant];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className={cn('relative flex items-start gap-1 rounded-xl border p-3', variantStyles.container, className)}
        >
          <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', variantStyles.icon)} />
          <div className="flex-1 space-y-1">
            <p className={cn('text-sm font-semibold', variantStyles.title)}>{title}</p>
            {description && <p className={cn('text-xs', variantStyles.description)}>{description}</p>}
          </div>
          {onDismiss && (
            <button
              onClick={() => {
                setVisible(false);
                setTimeout(() => onDismiss(), 200);
              }}
              className={cn('absolute top-2 right-2 cursor-pointer opacity-50 transition-opacity hover:opacity-100', variantStyles.icon)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
