'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/ui';

interface FieldErrorProps {
  message?: string | null;
  className?: string;
}

export function FieldError({ message, className }: FieldErrorProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={cn('text-destructive flex items-center gap-1 text-[11px] font-medium leading-tight md:text-xs', className)}
        >
          <AlertCircle className="h-3 w-3 shrink-0" />
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
