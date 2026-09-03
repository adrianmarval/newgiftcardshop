import { Suspense } from 'react';
import { Metadata } from 'next';
import { getBinanceBalances } from '@/actions/admin/binance';
import { getPlatformBalance } from '@/actions/platform';
import { getInventoryStats, getProfitStats, getStockAgingReport } from '@/actions/admin/stats';
import {
  BinanceBalanceSection,
  PlatformBalanceSection,
  ProfitSummarySection,
  ChartsSection,
  AgingSection,
} from '@/components/admin/dashboard-sections';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: `Panel de Administración | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Vista general de la plataforma, gestión de usuarios y análisis para ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
};

function StatCardSkeleton() {
  return (
    <Card className="bg-muted/50 flex flex-col justify-between gap-1">
      <CardHeader>
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-44" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <div className="col-span-1 md:col-span-1 lg:col-span-3">
      <Card className="bg-muted/50">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// Wrappers async server: fetchean el primer paint (streaming via Suspense) y
// lo pasan como initialData a las secciones client, que mantienen la data
// viva via React Query + invalidación SSE (el router nunca participa).

async function BinanceBalanceCard() {
  const [binanceRes, platformBalanceResponse] = await Promise.all([getBinanceBalances(), getPlatformBalance()]);
  return (
    <BinanceBalanceSection
      initial={{
        total: binanceRes.data?.total || 0,
        serverError: binanceRes.serverError,
        platformBalance: platformBalanceResponse.data?.balance || 0,
      }}
    />
  );
}

async function PlatformBalanceCard() {
  const platformBalanceResponse = await getPlatformBalance();
  return <PlatformBalanceSection initial={platformBalanceResponse.data?.balance || 0} />;
}

async function ProfitSummaryCards() {
  const profitRes = await getProfitStats();
  if (!profitRes.data) throw new Error('Failed to load profit stats');
  return <ProfitSummarySection initial={profitRes.data} />;
}

async function ChartsSectionCard() {
  // Ambas pegan al cache de 60s tras el primer fetch — no duplican trabajo real
  const [inventoryRes, profitRes] = await Promise.all([getInventoryStats(), getProfitStats()]);
  if (!profitRes.data) throw new Error('Failed to load profit stats');
  return <ChartsSection initialInventory={inventoryRes.data || []} initialProfit={profitRes.data} />;
}

async function AgingSectionCard() {
  const agingRes = await getStockAgingReport();
  return <AgingSection initial={agingRes.data || []} />;
}

export default function AdminDashboardPage() {
  return (
    <div className="w-full space-y-2">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Admin Dashboard</h1>
      <div className="grid auto-rows-min gap-1 md:grid-cols-3">
        <Suspense fallback={<StatCardSkeleton />}>
          <BinanceBalanceCard />
        </Suspense>
        <Suspense fallback={<StatCardSkeleton />}>
          <PlatformBalanceCard />
        </Suspense>
        <Suspense
          fallback={
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          }
        >
          <ProfitSummaryCards />
        </Suspense>
      </div>

      <div className="grid gap-1 md:grid-cols-2 lg:grid-cols-6">
        <Suspense
          fallback={
            <>
              <ChartSkeleton />
              <ChartSkeleton />
            </>
          }
        >
          <ChartsSectionCard />
        </Suspense>
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AgingSectionCard />
      </Suspense>
    </div>
  );
}
