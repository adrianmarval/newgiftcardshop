'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { type ProcessingStage, STAGE_LABELS, STAGE_PROGRESS } from '@/types';

interface ProcessingProgressProps {
  stage: ProcessingStage;
}

export function ProcessingProgress({ stage }: ProcessingProgressProps) {
  const isProcessing = stage !== 'idle' && stage !== 'done';

  return (
    <AnimatePresence>
      {isProcessing && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="shrink-0 overflow-hidden px-2 pb-2 md:px-4 md:pb-4"
        >
          <div className="border-primary/20 bg-primary/5 space-y-1 rounded-xl border p-3">
            <div className="flex items-center justify-between gap-1 text-sm">
              <div className="text-primary flex items-center gap-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{STAGE_LABELS[stage]}</span>
              </div>
              <span className="text-primary font-semibold">
                {STAGE_PROGRESS[stage]}%
              </span>
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <motion.div
                className="bg-primary h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${STAGE_PROGRESS[stage]}%` }}
                transition={{ ease: 'easeOut', duration: 0.35 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
