'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { LogCard } from './log-card';
import type { AppLogItem } from '@/types';

export type { AppLogItem };

interface AdminLogsListProps {
  logs: AppLogItem[];
  totalPages: number;
  totalCount: number;
}

export const AdminLogsList = ({ logs, totalPages: _totalPages, totalCount: _totalCount }: AdminLogsListProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastExpandedId, setLastExpandedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expandedId !== null) {
      const container = listRef.current?.closest('.overflow-y-scroll, .overflow-y-auto');
      if (container) {
        container.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
  }, [expandedId]);

  useEffect(() => {
    if (expandedId === null && lastExpandedId !== null) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`registry-card-${lastExpandedId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [expandedId, lastExpandedId]);

  const handleToggle = (id: string) => {
    setExpandedId((prev) => {
      const next = prev === id ? null : id;
      if (next === null) {
        setLastExpandedId(id);
      } else {
        setLastExpandedId(null);
      }
      return next;
    });
  };

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="text-muted-foreground/20 h-12 w-12" />}
        title="No se encontraron logs"
        description="Intenta ajustar tus filtros o palabras clave de búsqueda."
      />
    );
  }

  return (
    <div className="space-y-1" ref={listRef}>
      <AnimatePresence>
        {logs
          .filter((log) => expandedId === null || expandedId === log.id)
          .map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <LogCard
                log={log}
                isExpanded={expandedId === log.id}
                isHighlighted={lastExpandedId === log.id}
                onToggle={() => handleToggle(log.id)}
              />
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
};
