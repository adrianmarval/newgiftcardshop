import { useSellFlow } from '@/hooks/use-sell-flow';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
export const STEP_LABELS = ['Config', 'Load', 'Review'];

export const SellStepsProgress = () => {
  const step = useSellFlow((s) => s.step);
  return (
    <div
      data-tour="sell-progress"
      className="flex items-center justify-between gap-1.5 rounded-none p-1 backdrop-blur-sm md:flex-row md:items-center md:gap-6 md:rounded-xl md:border md:p-6"
    >
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="mb-0 text-lg font-bold md:mb-1 md:text-3xl">Steps</h1>
        <p className="text-muted-foreground hidden text-xs md:block md:text-base">Complete the batch in this session.</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex justify-center md:justify-end"
      >
        <div className="flex items-center gap-1 md:gap-1">
          {STEP_LABELS.map((label, idx) => {
            const s = idx + 1;
            return (
              <div key={s} className="flex items-center">
                <div className="group relative">
                  <motion.div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-all md:h-10 md:w-10 md:text-base ${
                      s === step
                        ? 'border-primary/50 bg-primary shadow-primary/30 shadow-lg'
                        : s < step
                          ? 'border-primary/50 bg-primary/20 text-primary'
                          : 'border-border bg-muted/50 text-muted-foreground/50'
                    } `}
                    animate={{ scale: s === step ? 1.05 : 1 }}
                  >
                    {s < step ? <Check className="h-4 w-4 md:h-5 md:w-5" /> : s}
                  </motion.div>
                  <span
                    className={`absolute -bottom-5 left-1/2 hidden -translate-x-1/2 text-sm font-bold tracking-wider whitespace-nowrap uppercase sm:block md:text-sm ${
                      s === step ? 'text-primary' : 'text-muted-foreground/70'
                    } `}
                  >
                    {label}
                  </span>
                </div>
                {idx < STEP_LABELS.length - 1 && (
                  <div className={`h-0.5 w-4 rounded-full transition-all md:w-8 ${s < step ? 'bg-primary/50' : 'bg-muted'} `} />
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
