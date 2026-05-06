'use client';

import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/currency-formatter';

const chartConfig = {
  profit: {
    label: 'Ganancia (USDT)',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

interface ProfitChartProps {
  chartData: { date: string; profit: number }[];
}

export function ProfitChart({ chartData }: ProfitChartProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Historial de Ganancias (30 días)</CardTitle>
        <CardDescription>Diferencial generado entre la compra y venta de tarjetas</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="h-full min-h-[300px] w-full">
          <AreaChart data={chartData} margin={{ top: 10, left: 12, right: 12, bottom: 0 }}>
            <defs>
              <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-profit)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-profit)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                // value is like '2023-10-05'
                const dateParts = value.split('-');
                if (dateParts.length === 3) {
                  const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                  return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
                }
                return value;
              }}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Area dataKey="profit" type="natural" fill="url(#fillProfit)" fillOpacity={0.4} stroke="var(--color-profit)" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
