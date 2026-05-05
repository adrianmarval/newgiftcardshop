import { IconCurrencyDollar, IconChartBar, IconCalendarEvent, IconCreditCard } from '@tabler/icons-react';
import { formatCurrency } from '@/lib/currency-formatter';
import { Metadata } from 'next';
import { getBinanceBalancesAction } from '@/actions/admin/binance';
import { getPlatformBalance } from '@/actions/platform/settings';
import { getInventoryStatsAction, getProfitStatsAction } from '@/actions/admin/dashboard-stats';
import { InventoryChart } from '@/components/admin/dashboard/inventory-chart';
import { ProfitChart } from '@/components/admin/dashboard/profit-chart';

import { Bitcoin, CircleDollarSignIcon, Equal, TrendingDown, TrendingUp } from 'lucide-react';
import { Decimal } from '@/generated/prisma/internal/prismaNamespaceBrowser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Panel de Administración | Solmaira Cards',
  description: 'Vista general de la plataforma, gestión de usuarios y análisis para Solmaira Cards',
};

export default async function AdminDashboardPage() {
  const [binanceRes, platformBalanceResponse, inventoryRes, profitRes] = await Promise.all([
    getBinanceBalancesAction(),
    getPlatformBalance(),
    getInventoryStatsAction(),
    getProfitStatsAction(),
  ]);

  const { data: binanceBalance, serverError } = binanceRes;
  const platformBalance = platformBalanceResponse.data?.balance.toNumber() || 0;

  const inventoryData = inventoryRes.data || [];
  const profitData = profitRes.data || { summary: { today: 0, week: 0, month: 0, todayVolume: 0 }, chartData: [] };
  const differential = new Decimal(binanceBalance?.total || 0).minus(new Decimal(platformBalance));
  const diffColor = differential.greaterThan(0) ? 'text-green-400' : differential.lessThan(0) ? 'text-red-400' : 'text-white/80';

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-4xl font-bold">Panel de Administración</h1>
        <p className="text-muted-foreground">Resumen y gestión de la plataforma</p>
      </div>

      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <Card className="bg-muted/50 flex flex-col justify-between gap-1">
          <CardHeader>
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
              <Bitcoin className="h-5 w-5" />
              Balance Binance
            </CardTitle>
            <CardDescription className="sr-only">Saldo en Binance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
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
          </CardContent>
        </Card>
        <Card className="bg-muted/50 flex flex-col justify-between gap-1">
          <CardHeader>
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
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
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
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
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
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
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
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
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-1 md:col-span-1 lg:col-span-3">
          <InventoryChart data={inventoryData} />
        </div>
        <div className="col-span-1 md:col-span-1 lg:col-span-4">
          <ProfitChart chartData={profitData.chartData} />
        </div>
      </div>
    </div>
  );
}
