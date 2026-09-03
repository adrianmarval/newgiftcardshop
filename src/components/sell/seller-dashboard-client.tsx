'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { IconPlus, IconGift, IconCurrencyDollar, IconCircleCheck, IconPackage, IconAlertTriangle, IconChevronRight } from '@tabler/icons-react';
import { Card, CardHeader, CardDescription, CardContent } from '@/components/ui/card';
import type { SellerStats, RecentBatch } from '@/types';
import { StatCard } from '@/components/common';
import { formatCurrency } from '@/lib/utils';
import { getSellerStats } from '@/actions/seller/stats';
import { recentBatches } from '@/actions/seller/batches';

interface SellerDashboardClientProps {
  initialStats: SellerStats;
  initialRecentBatches: RecentBatch[];
}

async function fetchSellerStats(): Promise<SellerStats> {
  const res = await getSellerStats();
  if (!res.data) throw new Error('Failed to load seller stats');
  return {
    pendingPayout: res.data.pendingPayout,
    totalEarned: res.data.totalEarned,
    inStockValue: res.data.inStockValue,
    problemCards: res.data.problemCards,
  };
}

async function fetchRecentBatches(): Promise<RecentBatch[]> {
  const res = await recentBatches();
  if (!res.data) throw new Error('Failed to load recent batches');
  return res.data.map((batch) => ({
    id: batch.id,
    sellRate: batch.sellRate,
    isPaid: batch.isPaid,
    cancelledAt: batch.cancelledAt,
    createdAt: batch.createdAt,
    giftcards: batch.giftcards,
    cardsCount: batch.cardsCount,
    confirmedCount: batch.confirmedCount,
    effectiveTotal: batch.effectiveTotal,
  }));
}

function getBatchStatus(batch: RecentBatch): { label: string; className: string } {
  if (batch.cancelledAt) {
    return { label: 'Cancelled', className: 'border border-red-500/30 bg-red-500/20 text-red-500' };
  }
  if (batch.isPaid) {
    return { label: 'Paid', className: 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-500' };
  }
  const allConfirmed = batch.cardsCount > 0 && batch.confirmedCount === batch.cardsCount;
  if (allConfirmed) {
    return { label: 'Confirmed', className: 'border border-blue-500/30 bg-blue-500/20 text-blue-500' };
  }
  return { label: 'Pending', className: 'border border-amber-500/30 bg-amber-500/20 text-amber-500' };
}

export function SellerDashboardClient({ initialStats, initialRecentBatches }: SellerDashboardClientProps) {
  const router = useRouter();

  // Data viva via React Query: los eventos SSE 'stats'/'batches' invalidan
  // estas queries y el dashboard se actualiza EN EL LUGAR (sin
  // router.refresh, sin races con la navegación).
  const { data: stats } = useQuery({
    queryKey: ['seller-dashboard-stats'],
    queryFn: fetchSellerStats,
    initialData: initialStats,
  });
  const { data: recentBatches } = useQuery({
    queryKey: ['seller-recent-batches'],
    queryFn: fetchRecentBatches,
    initialData: initialRecentBatches,
  });

  return (
    <div className="w-full space-y-2">
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Statistics</h2>
        <div className="grid grid-cols-2 gap-1 md:grid-cols-2 lg:grid-cols-4" data-tour="sell-stats">
          <StatCard
            title="Pending Payout"
            value={formatCurrency(stats.pendingPayout)}
            icon={<IconCurrencyDollar className="h-6 w-6 text-amber-500" />}
            description="Batches awaiting payment"
          />
          <StatCard
            title="Total Earned"
            value={formatCurrency(stats.totalEarned)}
            icon={<IconCircleCheck className="h-6 w-6 text-green-500" />}
            description="All-time paid batches"
          />
          <StatCard
            title="In-Stock Value"
            value={formatCurrency(stats.inStockValue)}
            icon={<IconPackage className="h-6 w-6 text-blue-500" />}
            description="Face value of unsold cards"
          />
          <StatCard
            title="Problem Cards"
            value={stats.problemCards.toString()}
            icon={<IconAlertTriangle className={`h-6 w-6 ${stats.problemCards > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />}
            description="Invalid / Already used / Wrong amount"
          />
        </div>
      </section>

      <section className="space-y-2" data-tour="sell-recent-batches">
        <div className="flex items-center justify-between p-1">
          <h2 className="text-xl font-semibold">Recent Batches</h2>
          <div className="flex items-center gap-2">
            <Link
              href="/sell/dashboard/sell-cards"
              data-tour="sell-cta"
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium"
            >
              <IconPlus className="h-4 w-4" />
              Sell Cards
            </Link>
            <Link href="/sell/dashboard/cards" className="text-primary text-sm hover:underline">
              View all
            </Link>
          </div>
        </div>
        {recentBatches.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentBatches.map((batch) => {
                  const status = getBatchStatus(batch);
                  return (
                    <button
                      key={batch.id}
                      onClick={() => router.push(`/sell/dashboard/cards?search=${batch.id}`)}
                      className="hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                    >
                      {batch.giftcards[0]?.brand.image ? (
                        <div className="relative h-8 w-8 shrink-0">
                          <Image src={batch.giftcards[0].brand.image} alt={batch.giftcards[0].brand.name} fill className="object-contain" />
                        </div>
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center text-lg">{batch.giftcards[0]?.brand.icon || '🎁'}</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Batch #{batch.id}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {batch.cardsCount} cards · {new Date(batch.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(batch.effectiveTotal)}</span>
                      <IconChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-1">
                <IconGift className="text-muted-foreground h-6 w-6" />
                <CardDescription>No batches yet. Start selling cards to see them here.</CardDescription>
              </div>
            </CardHeader>
          </Card>
        )}
      </section>
    </div>
  );
}
