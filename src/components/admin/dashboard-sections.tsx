'use client';

import { useQuery } from '@tanstack/react-query';
import { IconCurrencyDollar, IconChartBar, IconCalendarEvent, IconCreditCard } from '@tabler/icons-react';
import { Bitcoin, CircleDollarSignIcon, Equal, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryChart, ProfitChart } from '@/components/admin/charts';
import { StockAgingTable } from '@/components/admin/stock-aging-table';
import { AdminWithdrawButton } from '@/components/admin/payments';
import { getBinanceBalances } from '@/actions/admin/binance';
import { getPlatformBalance } from '@/actions/platform';
import { getInventoryStats, getProfitStats, getStockAgingReport } from '@/actions/admin/stats';
import { formatCurrency } from '@/lib/utils';

/**
 * Secciones del admin home dashboard. Data viva via React Query: los eventos
 * SSE ('orders'/'payments'/'batches') invalidan estas query keys (ver
 * REALTIME_QUERY_KEYS) y cada sección se actualiza EN EL LUGAR — el router
 * NUNCA participa (sin races con la navegación). El server page fetchea el
 * primer paint y lo pasa como initialData.
 */

async function fetchBinanceBalance() {
  const [binanceRes, platformBalanceRes] = await Promise.all([getBinanceBalances(), getPlatformBalance()]);
  return {
    total: binanceRes.data?.total || 0,
    serverError: binanceRes.serverError,
    platformBalance: platformBalanceRes.data?.balance || 0,
  };
}

async function fetchPlatformBalance() {
  const res = await getPlatformBalance();
  return res.data?.balance || 0;
}

async function fetchProfitStats() {
  const res = await getProfitStats();
  if (!res.data) throw new Error('Failed to load profit stats');
  return res.data;
}

async function fetchInventoryStats() {
  const res = await getInventoryStats();
  return res.data || [];
}

async function fetchStockAging() {
  const res = await getStockAgingReport();
  return res.data || [];
}

export type BinanceBalanceData = Awaited<ReturnType<typeof fetchBinanceBalance>>;
export type ProfitStatsData = Awaited<ReturnType<typeof fetchProfitStats>>;
export type InventoryStatsData = Awaited<ReturnType<typeof fetchInventoryStats>>;
export type StockAgingData = Awaited<ReturnType<typeof fetchStockAging>>;

export function BinanceBalanceSection({ initial }: { initial: BinanceBalanceData }) {
  const { data } = useQuery({
    queryKey: ['admin-binance-balance'],
    queryFn: fetchBinanceBalance,
    initialData: initial,
  });

  // data.total viene como string desde la action (schema z.string())
  const differential = Number(data.total) - data.platformBalance;
  const diffColor = differential > 0 ? 'text-green-400' : differential < 0 ? 'text-red-400' : 'text-white/80';

  return (
    <Card className="bg-muted/50 flex flex-col justify-between gap-1">
      <CardHeader>
        <CardTitle className="text-muted-foreground flex items-center gap-1 text-base font-medium">
          <Bitcoin className="h-5 w-5" />
          Balance Binance
        </CardTitle>
        <CardDescription className="sr-only">Saldo en Binance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1">
          <span className="text-4xl font-bold">{formatCurrency(data.total)}</span>
          {!data.serverError && (
            <div className={`mt-1 flex items-center text-xs font-medium ${diffColor}`}>
              {differential > 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : differential < 0 ? (
                <TrendingDown className="mr-1 h-3 w-3" />
              ) : (
                <Equal className="mr-1 h-3 w-3" />
              )}
              <span>{formatCurrency(Math.abs(differential))} diff</span>
            </div>
          )}
        </div>
        <div className="mt-2">
          <AdminWithdrawButton />
        </div>
      </CardContent>
    </Card>
  );
}

export function PlatformBalanceSection({ initial }: { initial: number }) {
  const { data: platformBalance } = useQuery({
    queryKey: ['platform-balance'],
    queryFn: fetchPlatformBalance,
    initialData: initial,
  });

  return (
    <Card className="bg-muted/50 flex flex-col justify-between gap-1">
      <CardHeader>
        <CardTitle className="text-muted-foreground flex items-center gap-1 text-base font-medium">
          <CircleDollarSignIcon className="h-5 w-5" />
          Balance Plataforma
        </CardTitle>
        <CardDescription className="sr-only">Saldo en la plataforma</CardDescription>
      </CardHeader>
      <CardContent>
        <span className="text-4xl font-bold">{formatCurrency(platformBalance)}</span>
      </CardContent>
    </Card>
  );
}

export function ProfitSummarySection({ initial }: { initial: ProfitStatsData }) {
  const { data } = useQuery({
    queryKey: ['admin-profit-stats'],
    queryFn: fetchProfitStats,
    initialData: initial,
  });
  const summary = data.summary;

  return (
    <>
      <Card className="bg-muted/50 flex flex-col justify-between gap-1">
        <CardHeader>
          <CardTitle className="text-muted-foreground flex items-center gap-1 text-base font-medium">
            <IconCreditCard className="h-5 w-5" />
            Volumen de Giftcards (HOY)
          </CardTitle>
          <CardDescription className="sr-only">Volumen transaccionado hoy</CardDescription>
        </CardHeader>
        <CardContent>
          <span className="text-4xl font-bold">{formatCurrency(summary.todayVolume)}</span>
        </CardContent>
      </Card>

      <Card className="bg-muted/50 flex flex-col justify-between gap-1">
        <CardHeader>
          <CardTitle className="text-muted-foreground flex items-center gap-1 text-base font-medium">
            <IconCurrencyDollar className="h-5 w-5" />
            Ganancia (Hoy)
          </CardTitle>
          <CardDescription className="sr-only">Ganancia de hoy</CardDescription>
        </CardHeader>
        <CardContent>
          <span className="text-4xl font-bold text-green-500">{formatCurrency(summary.today)}</span>
        </CardContent>
      </Card>

      <Card className="bg-muted/50 flex flex-col justify-between gap-1">
        <CardHeader>
          <CardTitle className="text-muted-foreground flex items-center gap-1 text-base font-medium">
            <IconChartBar className="h-5 w-5" />
            Ganancia (Semana)
          </CardTitle>
          <CardDescription className="sr-only">Ganancia de la semana</CardDescription>
        </CardHeader>
        <CardContent>
          <span className="text-4xl font-bold text-green-500">{formatCurrency(summary.week)}</span>
        </CardContent>
      </Card>

      <Card className="bg-muted/50 flex flex-col justify-between gap-1">
        <CardHeader>
          <CardTitle className="text-muted-foreground flex items-center gap-1 text-base font-medium">
            <IconCalendarEvent className="h-5 w-5" />
            Ganancia (Mes)
          </CardTitle>
          <CardDescription className="sr-only">Ganancia del mes</CardDescription>
        </CardHeader>
        <CardContent>
          <span className="text-4xl font-bold text-green-500">{formatCurrency(summary.month)}</span>
        </CardContent>
      </Card>
    </>
  );
}

export function ChartsSection({ initialInventory, initialProfit }: { initialInventory: InventoryStatsData; initialProfit: ProfitStatsData }) {
  const { data: inventoryData } = useQuery({
    queryKey: ['admin-inventory-stats'],
    queryFn: fetchInventoryStats,
    initialData: initialInventory,
  });
  // Misma query key que ProfitSummarySection: React Query comparte el cache
  const { data: profitData } = useQuery({
    queryKey: ['admin-profit-stats'],
    queryFn: fetchProfitStats,
    initialData: initialProfit,
  });

  return (
    <>
      <div className="col-span-1 md:col-span-1 lg:col-span-3">
        <InventoryChart data={inventoryData} />
      </div>
      <div className="col-span-1 md:col-span-1 lg:col-span-3">
        <ProfitChart charts={profitData.charts} />
      </div>
    </>
  );
}

export function AgingSection({ initial }: { initial: StockAgingData }) {
  const { data } = useQuery({
    queryKey: ['admin-stock-aging'],
    queryFn: fetchStockAging,
    initialData: initial,
  });
  return <StockAgingTable data={data} />;
}
