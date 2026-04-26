'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/date-formatter';
import Image from 'next/image';

interface EntityCardProps {
  id: string;
  image?: string;
  imageAlt?: string;
  title: string;
  faceValue: number;
  priceLabel: string;
  priceValue: number;
  createdAt: string;
  locale?: 'es-AR' | 'en-US';
  progressPercentage: number;
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled';
  isExpanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

const statusColors: Record<EntityCardProps['status'], string> = {
  pending: 'bg-amber-500/20 text-amber-500',
  confirmed: 'bg-blue-500/20 text-blue-500',
  paid: 'bg-emerald-500/20 text-emerald-500',
  cancelled: 'bg-destructive/20 text-destructive',
};

const progressColor: Record<EntityCardProps['status'], string> = {
  pending: 'bg-blue-500',
  confirmed: 'bg-blue-500',
  paid: 'bg-emerald-500',
  cancelled: 'bg-destructive',
};

export function EntityCard({
  id,
  image,
  imageAlt,
  title,
  faceValue,
  priceLabel,
  priceValue,
  createdAt,
  locale = 'es-AR',
  progressPercentage,
  status,
  isExpanded,
  onToggle,
  children,
}: EntityCardProps) {
  const progColor = progressColor[status];

  return (
    <Card
      onClick={onToggle}
      className={`hover:border-primary/30 relative cursor-pointer overflow-hidden py-2 transition-all duration-200 ease-out ${isExpanded ? 'ring-primary/20 ring-1' : ''}`}
    >
      <CardHeader>
        <CardTitle>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 md:gap-4">
            {image && (
              <Image
                src={image}
                alt={imageAlt || ''}
                width={20}
                height={20}
                style={{ width: 'auto', height: 'auto' }}
                className="h-10 w-10 rounded-lg object-contain p-1"
              />
            )}

            <div className="flex flex-col gap-0.5">
              <span className="text-foreground text-md font-medium md:text-base">{title}</span>
            </div>

            <div className="flex flex-col items-end gap-0.5">
              <span className="text-foreground text-md font-semibold md:text-lg">${faceValue.toFixed(0)}</span>
              <span className="text-muted-foreground text-xs md:text-sm">
                {priceLabel}: ${priceValue.toFixed(2)}
              </span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">{formatDateTime(createdAt, locale)}</span>
        <ChevronDown
          className={`text-muted-foreground cursor-pointer transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          onClick={onToggle}
        />
      </CardContent>

      <div className="bg-muted flex h-1 overflow-hidden rounded-full">
        {status === 'cancelled' ? (
          <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className={`h-full ${progressColor.cancelled}`} />
        ) : status === 'paid' ? (
          <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className={`h-full ${progressColor.paid}`} />
        ) : (
          <>
            <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} className={`h-full ${progColor}`} />
            <div className="bg-muted flex-1" />
          </>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="border-border cursor-default border-t p-3" onClick={(e) => e.stopPropagation()}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
