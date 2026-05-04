import { IconCurrencyDollar, IconChartBar, IconCalendarEvent, IconCreditCard } from '@tabler/icons-react';
import { formatCurrency } from '@/lib/currency-formatter';
import { Metadata } from 'next';
import { getBinanceBalancesAction } from '@/actions/admin/binance';
import { getPlatformBalance } from '@/actions/platform/settings';
import { adminGetSellers, adminGetBuyers } from '@/actions';
import { getInventoryStatsAction, getProfitStatsAction } from '@/actions/admin/dashboard-stats';
import { InventoryChart } from '@/components/admin/dashboard/inventory-chart';
import { ProfitChart } from '@/components/admin/dashboard/profit-chart';

import { BalanceCard } from '@/components/ui/balance-card';

export const metadata: Metadata = {
  title: 'Panel de Administración | Solmaira Cards',
  description: 'Vista general de la plataforma, gestión de usuarios y análisis para Solmaira Cards',
};

export default async function AdminDashboardPage() {
  const [binanceRes, platformBalanceResponse, sellersResult, buyersResult, inventoryRes, profitRes] = await Promise.all([
    getBinanceBalancesAction(),
    getPlatformBalance(),
    adminGetSellers(),
    adminGetBuyers(),
    getInventoryStatsAction(),
    getProfitStatsAction(),
  ]);

  const { data: binanceBalance, serverError } = binanceRes;
  const platformBalance = platformBalanceResponse.data?.balance.toNumber() || 0;

  const sellers = sellersResult.data?.success ? sellersResult.data.sellers : [];
  const buyers = buyersResult.data?.success ? buyersResult.data.buyers : [];

  const inventoryData = inventoryRes.data || [];
  const profitData = profitRes.data || { summary: { today: 0, week: 0, month: 0, todayVolume: 0 }, chartData: [] };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-4xl font-bold">Panel de Administración</h1>
        <p className="text-muted-foreground">Resumen y gestión de la plataforma</p>
      </div>

      <BalanceCard
        platformBalance={platformBalance}
        binanceBalance={binanceBalance?.total || 0}
        error={serverError}
        sellers={sellers}
        buyers={buyers}
      />

      <div className="grid auto-rows-min gap-4 md:grid-cols-4">
        <div className="bg-muted/50 flex flex-col gap-2 rounded-xl p-6">
          <div className="text-muted-foreground flex items-center gap-2">
            <IconCreditCard className="h-5 w-5" />
            <span className="text-base font-medium">Volumen (Hoy)</span>
          </div>
          <span className="text-4xl font-bold">{formatCurrency(profitData.summary.todayVolume)}</span>
        </div>

        <div className="bg-muted/50 flex flex-col gap-2 rounded-xl p-6">
          <div className="text-muted-foreground flex items-center gap-2">
            <IconCurrencyDollar className="h-5 w-5" />
            <span className="text-base font-medium">Ganancia (Hoy)</span>
          </div>
          <span className="text-4xl font-bold text-green-500">{formatCurrency(profitData.summary.today)}</span>
        </div>

        <div className="bg-muted/50 flex flex-col gap-2 rounded-xl p-6">
          <div className="text-muted-foreground flex items-center gap-2">
            <IconChartBar className="h-5 w-5" />
            <span className="text-base font-medium">Ganancia (Semana)</span>
          </div>
          <span className="text-4xl font-bold text-green-500">{formatCurrency(profitData.summary.week)}</span>
        </div>

        <div className="bg-muted/50 flex flex-col gap-2 rounded-xl p-6">
          <div className="text-muted-foreground flex items-center gap-2">
            <IconCalendarEvent className="h-5 w-5" />
            <span className="text-base font-medium">Ganancia (Mes)</span>
          </div>
          <span className="text-4xl font-bold text-green-500">{formatCurrency(profitData.summary.month)}</span>
        </div>
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
