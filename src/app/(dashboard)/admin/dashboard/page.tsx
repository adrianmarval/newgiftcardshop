import { IconCurrencyDollar, IconChartBar, IconCalendarEvent, IconCreditCard } from '@tabler/icons-react';
import { formatCurrency } from '@/lib/utils';
import { Metadata } from 'next';
import { getBinanceBalances } from '@/actions/admin/binance';
import { getPlatformBalance } from '@/actions/platform';
import { getInventoryStats, getProfitStats, getStockAgingReport } from '@/actions/admin/stats';
import { InventoryChart, ProfitChart } from '@/components/admin/charts';
import { StockAgingTable } from '@/components/admin/stock-aging-table';
import { AdminWithdrawButton } from '@/components/admin/payments';

import { Bitcoin, CircleDollarSignIcon, Equal, TrendingDown, TrendingUp } from 'lucide-react';
import { Decimal } from '@prisma/client/runtime/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: `Panel de Administración | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Vista general de la plataforma, gestión de usuarios y análisis para ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
};

export default async function AdminDashboardPage() {
  const [binanceRes, platformBalanceResponse, inventoryRes, profitRes, agingRes] = await Promise.all([
    getBinanceBalances(),
    getPlatformBalance(),
    getInventoryStats(),
    getProfitStats(),
    getStockAgingReport(),
  ]);

  const { data: binanceBalance, serverError } = binanceRes;
  const platformBalance = platformBalanceResponse.data?.balance || 0;

  const inventoryData = inventoryRes.data || [];
  const profitData = profitRes.data || {
    summary: { today: 0, week: 0, month: 0, todayVolume: 0 },
    charts: { daily: [], monthly: [], yearly: [] },
  };
  const differential = new Decimal(binanceBalance?.total || 0).minus(new Decimal(platformBalance));
  const diffColor = differential.greaterThan(0) ? 'text-green-400' : differential.lessThan(0) ? 'text-red-400' : 'text-white/80';

  return (
    <div className="w-full space-y-2">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Admin Dashboard</h1>
      <div className="grid auto-rows-min gap-1 md:grid-cols-3">
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
              <span className="text-4xl font-bold">{formatCurrency(binanceBalance?.total || 0)}</span>
              {!serverError && (
                <div className={`mt-1 flex items-center text-xs font-medium ${diffColor}`}>
                  {differential.greaterThan(0) ? (
                    <TrendingUp className="mr-1 h-3 w-3" />
                  ) : differential.lessThan(0) ? (
                    <TrendingDown className="mr-1 h-3 w-3" />
                  ) : (
                    <Equal className="mr-1 h-3 w-3" />
                  )}
                  <span>{formatCurrency(differential.abs().toNumber())} diff</span>
                </div>
              )}
            </div>
            <div className="mt-2">
              <AdminWithdrawButton />
            </div>
          </CardContent>
        </Card>
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
        <Card className="bg-muted/50 flex flex-col justify-between gap-1">
          <CardHeader>
            <CardTitle className="text-muted-foreground flex items-center gap-1 text-base font-medium">
              <IconCreditCard className="h-5 w-5" />
              Volumen de Giftcards (HOY)
            </CardTitle>
            <CardDescription className="sr-only">Volumen transaccionado hoy</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-4xl font-bold">{formatCurrency(profitData.summary.todayVolume)}</span>
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
            <span className="text-4xl font-bold text-green-500">{formatCurrency(profitData.summary.today)}</span>
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
            <span className="text-4xl font-bold text-green-500">{formatCurrency(profitData.summary.week)}</span>
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
            <span className="text-4xl font-bold text-green-500">{formatCurrency(profitData.summary.month)}</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-1 md:grid-cols-2 lg:grid-cols-6">
        <div className="col-span-1 md:col-span-1 lg:col-span-3">
          <InventoryChart data={inventoryData} />
        </div>
        <div className="col-span-1 md:col-span-1 lg:col-span-3">
          <ProfitChart charts={profitData.charts} />
        </div>
      </div>

      <StockAgingTable data={agingRes.data || []} />
    </div>
  );
}
