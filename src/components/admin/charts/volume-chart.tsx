'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiQuery, getCountryFlag } from '@/lib/utils';
import type { getVolumeStats as getVolumeStatsService } from '@/lib/services/stats';

const chartConfig = {
  volume: {
    label: 'Volumen (USDT)',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

type VolumePeriod = 'daily' | 'monthly' | 'yearly';

export type VolumeStatsData = Awaited<ReturnType<typeof getVolumeStatsService>>;

export interface VolumeBrandCountryOption {
  id: string;
  brandName: string;
  countryName: string;
  countryCode: string;
}

interface VolumeChartProps {
  initial: VolumeStatsData;
  /** Opciones del filtro marca/país (todas las brand-countries, del server page) */
  brandCountries: VolumeBrandCountryOption[];
}

const PERIOD_DESCRIPTIONS: Record<VolumePeriod, string> = {
  daily: 'Últimos 30 días, agrupado por día',
  monthly: 'Últimos 12 meses, agrupado por mes',
  yearly: 'Historial completo, agrupado por año',
};

function parseDateKey(value: string): Date {
  const [year, month = 1, day = 1] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatTick(value: string, period: VolumePeriod): string {
  if (period === 'yearly') return value;
  if (period === 'monthly') {
    return parseDateKey(value).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
  }
  return parseDateKey(value).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
}

function formatTooltipLabel(value: string, period: VolumePeriod): string {
  if (period === 'yearly') return `Año ${value}`;
  if (period === 'monthly') {
    return parseDateKey(value).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }
  return parseDateKey(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Filtro client-side: cada brandCountryId es una variante de la query key
// (['admin-volume-stats', { brandCountryId }]) — la invalidación SSE es por
// prefijo y cubre todas las variantes. keepPreviousData evita el flash al
// cambiar de marca (mismo patrón que las listas con useListQuery).
export function VolumeChart({ initial, brandCountries }: VolumeChartProps) {
  const [period, setPeriod] = useState<VolumePeriod>('daily');
  const [brandCountryId, setBrandCountryId] = useState<string>('all');

  const filter = { brandCountryId: brandCountryId === 'all' ? null : brandCountryId };
  const { data: stats } = useQuery({
    queryKey: ['admin-volume-stats', filter],
    queryFn: () => apiQuery<VolumeStatsData>('admin-volume-stats', filter),
    initialData: brandCountryId === 'all' ? initial : undefined,
    placeholderData: keepPreviousData,
  });

  const data = stats?.charts[period] ?? [];
  const average = data.length > 0 ? data.reduce((sum, point) => sum + point.volume, 0) / data.length : 0;
  const formattedAverage = average.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Card className="py-2">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>Volumen Comerciado</CardTitle>
          <CardDescription>{PERIOD_DESCRIPTIONS[period]}</CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={brandCountryId} onValueChange={setBrandCountryId}>
              <SelectTrigger className="w-[180px]" aria-label="Filtrar por marca y país">
                <SelectValue placeholder="Todas las marcas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las marcas</SelectItem>
                {brandCountries.map((bc) => (
                  <SelectItem key={bc.id} value={bc.id}>
                    {getCountryFlag(bc.countryCode)} {bc.brandName} • {bc.countryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tabs value={period} onValueChange={(value) => setPeriod(value as VolumePeriod)}>
              <TabsList>
                <TabsTrigger value="daily">Día</TabsTrigger>
                <TabsTrigger value="monthly">Mes</TabsTrigger>
                <TabsTrigger value="yearly">Año</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <p className="text-sm">
            <span className="text-muted-foreground">Promedio: </span>
            <span className="font-semibold tabular-nums">{formattedAverage} USDT</span>
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig}>
          <BarChart data={data} margin={{ top: 10, left: 12, right: 12, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatTick(String(value), period)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" labelFormatter={(value) => formatTooltipLabel(String(value), period)} />}
            />
            <Bar dataKey="volume" fill="var(--color-volume)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
