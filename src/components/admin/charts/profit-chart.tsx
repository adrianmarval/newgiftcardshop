'use client';

import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const chartConfig = {
  profit: {
    label: 'Ganancia (USDT)',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

type ProfitPeriod = 'daily' | 'monthly' | 'yearly';

type ProfitChartPoint = { date: string; profit: number };

interface ProfitChartProps {
  charts: {
    daily: ProfitChartPoint[];
    monthly: ProfitChartPoint[];
    yearly: ProfitChartPoint[];
  };
}

const PERIOD_DESCRIPTIONS: Record<ProfitPeriod, string> = {
  daily: 'Últimos 30 días, agrupado por día',
  monthly: 'Últimos 12 meses, agrupado por mes',
  yearly: 'Historial completo, agrupado por año',
};

function parseDateKey(value: string): Date {
  const [year, month = 1, day = 1] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatTick(value: string, period: ProfitPeriod): string {
  if (period === 'yearly') return value;
  if (period === 'monthly') {
    return parseDateKey(value).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
  }
  return parseDateKey(value).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
}

function formatTooltipLabel(value: string, period: ProfitPeriod): string {
  if (period === 'yearly') return `Año ${value}`;
  if (period === 'monthly') {
    return parseDateKey(value).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }
  return parseDateKey(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function ProfitChart({ charts }: ProfitChartProps) {
  const [period, setPeriod] = useState<ProfitPeriod>('daily');

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>Historial de Ganancias</CardTitle>
          <CardDescription>{PERIOD_DESCRIPTIONS[period]}</CardDescription>
        </div>
        <Tabs value={period} onValueChange={(value) => setPeriod(value as ProfitPeriod)}>
          <TabsList>
            <TabsTrigger value="daily">Día</TabsTrigger>
            <TabsTrigger value="monthly">Mes</TabsTrigger>
            <TabsTrigger value="yearly">Año</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig}>
          <BarChart data={charts[period]} margin={{ top: 10, left: 12, right: 12, bottom: 0 }}>
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
              content={
                <ChartTooltipContent
                  indicator="dashed"
                  labelFormatter={(value) => formatTooltipLabel(String(value), period)}
                />
              }
            />
            <Bar dataKey="profit" fill="var(--color-profit)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
