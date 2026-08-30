'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import NumberFlow from '@number-flow/react';
import { IconArrowRight } from '@tabler/icons-react';
import type { z } from 'zod';
import type { liveAvailabilityItemSchema } from '@/actions/buyer/stats/schemas';
import { Card, CardHeader, CardDescription } from '@/components/ui/card';
import { getCountryFlag } from '@/lib/utils';
import { cn } from '@/lib/ui';

export type LiveAvailabilityItem = z.infer<typeof liveAvailabilityItemSchema>;

interface LiveAvailabilityGridProps {
  items: LiveAvailabilityItem[];
}

function AnimatedMoney({ value, currency, className }: { value: number; currency: string; className?: string }) {
  // `locales` pineado: sin esto el SSR formatea con el locale de Node (en-US → "$240")
  // y al hidratar NumberFlow reformatea con el locale del browser (es-419 → "USD 240").
  return (
    <NumberFlow
      value={value}
      locales="en-US"
      format={{ style: 'currency', currency, currencyDisplay: 'symbol', trailingZeroDisplay: 'stripIfInteger' }}
      className={className}
    />
  );
}

function AvailabilityCard({ item }: { item: LiveAvailabilityItem }) {
  const router = useRouter();
  const soldOut = item.totalCount === 0;

  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={() => router.push(`/store/dashboard/browse-cards?brand=${item.brandId}&country=${item.countryId}`)}
      className={cn(
        'group flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
        soldOut ? 'opacity-50' : 'hover:bg-muted/50 hover:border-primary/40',
      )}
    >
      {item.brandImage ? (
        <div className="relative h-10 w-10 shrink-0">
          <Image src={item.brandImage} alt={item.brandName} fill className="object-contain" />
        </div>
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center text-2xl">{item.brandIcon || '🎁'}</span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{item.brandName}</span>
          <span className="text-muted-foreground text-xs">
            {getCountryFlag(item.countryCode)} {item.countryCode}
          </span>
        </div>

        {/* Monto ACCESIBLE (tier <= buyRate) — lo que el buyer puede comprar ya */}
        <div className="flex items-baseline gap-1.5">
          <AnimatedMoney
            value={item.accessibleAmount}
            currency={item.currency}
            className="text-primary text-lg leading-tight font-bold tabular-nums"
          />
          <span className="text-muted-foreground text-xs">a tu tasa</span>
        </div>

        {/* Monto total en stock (todos los tiers) — siempre visible, en gris */}
        <div className="text-muted-foreground flex items-baseline gap-1 text-xs">
          <AnimatedMoney value={item.totalAmount} currency={item.currency} className="tabular-nums" />
          <span>en plataforma</span>
        </div>
      </div>

      {soldOut ? (
        <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium">Agotado</span>
      ) : (
        <IconArrowRight className="text-muted-foreground group-hover:text-primary h-4 w-4 shrink-0 transition-colors" />
      )}
    </button>
  );
}

export function LiveAvailabilityGrid({ items }: LiveAvailabilityGridProps) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => b.accessibleAmount - a.accessibleAmount || b.totalAmount - a.totalAmount),
    [items],
  );

  return (
    <section className="space-y-2" data-tour="buy-explore">
      <div className="flex items-center justify-between p-1">
        <h2 className="text-xl font-semibold">Disponibles para ti</h2>
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Stock en vivo
        </p>
      </div>

      {sorted.length > 0 ? (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((item) => (
            <AvailabilityCard key={item.brandCountryId} item={item} />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardDescription>No tienes marcas con tarifa asignada. Contacta al administrador para empezar a comprar.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </section>
  );
}
