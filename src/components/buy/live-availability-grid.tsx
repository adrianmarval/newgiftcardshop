'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NumberFlow from '@number-flow/react';
import { IconArrowRight } from '@tabler/icons-react';
import { Bell, BellOff } from 'lucide-react';
import type { z } from 'zod';
import type { liveAvailabilityItemSchema } from '@/actions/buyer/stats/schemas';
import { getLiveAvailability } from '@/actions/buyer/stats/get-live-availability';
import { updateNotificationPreferences } from '@/actions/notifications';
import { Card, CardHeader, CardDescription } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { getCountryFlag } from '@/lib/utils';
import { cn, showAlert } from '@/lib/ui';

export type LiveAvailabilityItem = z.infer<typeof liveAvailabilityItemSchema>;

interface LiveAvailabilityGridProps {
  items: LiveAvailabilityItem[];
  stockAlertsEnabled: boolean;
}

async function fetchLiveAvailability() {
  const res = await getLiveAvailability();
  if (!res.data) throw new Error('Failed to load availability');
  return res.data;
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
          <span className="text-muted-foreground text-xs">a tu tasa ({(item.buyRate * 100).toFixed(0)}%)</span>
        </div>

        {/* Monto total en stock (todos los tiers) — siempre visible, estilo amber */}
        <div className="flex items-baseline gap-1.5">
          <AnimatedMoney
            value={item.totalAmount}
            currency={item.currency}
            className="text-amber-500 text-lg leading-tight font-bold tabular-nums"
          />
          <span className="text-muted-foreground text-xs">en plataforma</span>
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

/**
 * Toggle de alertas de stock (Telegram/Push). Optimista con revert en error.
 * La campana in-app SIEMPRE llega al instante — esto solo gobierna los canales
 * interruptivos (ver dispatcher: STOCK_AVAILABLE + stockAlertsEnabled).
 */
function StockAlertsToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    setLoading(true);
    try {
      const res = await updateNotificationPreferences({ stockAlertsEnabled: next });
      if (!res?.data?.success) {
        setEnabled(!next);
        showAlert.toast.error('No se pudo guardar. Intenta de nuevo.');
      } else {
        // Persistir el flag en el cache para que sobreviva remounts
        queryClient.setQueryData(['live-availability'], (old: { items: LiveAvailabilityItem[]; stockAlertsEnabled: boolean } | undefined) =>
          old ? { ...old, stockAlertsEnabled: next } : old,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      role="switch"
      aria-checked={enabled}
      title={enabled ? 'Alertas de stock activadas (Telegram/Push)' : 'Alertas de stock solo en la app'}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        enabled ? 'border-amber-500/40 bg-amber-500/10 text-amber-500' : 'border-border text-muted-foreground hover:bg-muted/50',
      )}
    >
      {loading ? (
        <Spinner size="sm" />
      ) : enabled ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      {enabled ? 'Alertas ON' : 'Alertas OFF'}
    </button>
  );
}

export function LiveAvailabilityGrid({ items, stockAlertsEnabled }: LiveAvailabilityGridProps) {
  // Data viva via React Query: los eventos SSE 'availability' invalidan
  // ['live-availability'] y el grid se actualiza EN EL LUGAR (sin
  // router.refresh, sin re-render de la página completa).
  const { data } = useQuery({
    queryKey: ['live-availability'],
    queryFn: fetchLiveAvailability,
    initialData: { items, stockAlertsEnabled },
  });

  const sorted = useMemo(
    () => [...data.items].sort((a, b) => b.accessibleAmount - a.accessibleAmount || b.totalAmount - a.totalAmount),
    [data.items],
  );

  return (
    <section className="space-y-2" data-tour="buy-explore">
      <div className="flex items-center justify-between gap-2 p-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Stock en vivo</h2>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        </div>
        <StockAlertsToggle initialEnabled={data.stockAlertsEnabled} />
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
