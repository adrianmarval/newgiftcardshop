'use client';

import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import NumberFlow from '@number-flow/react';
import type { z } from 'zod';
import type { getAdminLiveStockOutputSchema } from '@/actions/admin/stats/schemas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiQuery, getCountryFlag } from '@/lib/utils';
import { cn } from '@/lib/ui';
import { IconPackage } from '@tabler/icons-react';

type AdminLiveStockData = z.infer<typeof getAdminLiveStockOutputSchema>;
type AdminLiveStockItem = AdminLiveStockData['items'][number];

async function fetchAdminLiveStock() {
  return apiQuery<AdminLiveStockData>('admin-live-stock');
}

function AnimatedMoney({ value, currency, className }: { value: number; currency: string; className?: string }) {
  // Mismo patrón que el grid del buyer: `locales` pineado (SSR/CSR mismatch de
  // NumberFlow) y wrapper `notranslate` (Google Translate muta text nodes y
  // NumberFlow — DOM directo — crashea con removeChild). NO quitar.
  return (
    <span translate="no" className="notranslate">
      <NumberFlow
        value={value}
        locales="en-US"
        format={{ style: 'currency', currency, currencyDisplay: 'symbol', trailingZeroDisplay: 'stripIfInteger' }}
        className={className}
      />
    </span>
  );
}

function LiveStockCard({ item }: { item: AdminLiveStockItem }) {
  const soldOut = item.totalCount === 0;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border p-3 transition-colors',
        soldOut && 'opacity-50',
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
        <div className="flex items-baseline gap-1.5">
          <AnimatedMoney
            value={item.totalAmount}
            currency={item.currency}
            className="text-primary text-lg leading-tight font-bold tabular-nums"
          />
          <span className="text-muted-foreground text-xs">
            {item.totalCount} {item.totalCount === 1 ? 'tarjeta' : 'tarjetas'}
          </span>
        </div>
      </div>

      {soldOut && (
        <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium">Agotado</span>
      )}
    </div>
  );
}

/**
 * Stock en vivo GLOBAL de la plataforma (vista admin — sin scoping por tasa).
 * Data viva via React Query: los eventos SSE 'batches'/'orders' invalidan
 * ['admin-live-stock'] y el grid se actualiza EN EL LUGAR (el router nunca
 * participa). El server page fetchea el primer paint como initialData.
 */
export function AdminLiveStockGrid({ initial }: { initial: AdminLiveStockData }) {
  const { data } = useQuery({
    queryKey: ['admin-live-stock'],
    queryFn: fetchAdminLiveStock,
    initialData: initial,
  });

  return (
    <Card className="bg-muted/50 gap-1">
      <CardHeader>
        <CardTitle className="text-muted-foreground flex items-center gap-1 text-base font-medium">
          <IconPackage className="h-5 w-5" />
          Stock en Vivo
          <span className="relative ml-1 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        </CardTitle>
        <CardDescription>Inventario disponible por marca/país en tiempo real</CardDescription>
      </CardHeader>
      <CardContent>
        {data.items.length > 0 ? (
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((item) => (
              <LiveStockCard key={item.brandCountryId} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground py-6 text-center text-sm">Sin marcas activas en el catálogo</p>
        )}
      </CardContent>
    </Card>
  );
}
