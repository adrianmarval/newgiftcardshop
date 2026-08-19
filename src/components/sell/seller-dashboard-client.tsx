'use client';

import Link from 'next/link';
import Image from 'next/image';
import { IconPlus, IconGift, IconCurrencyDollar, IconCircleCheck, IconPackage, IconAlertTriangle } from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { SellerStats, RecentBatch } from '@/types';
import { StatCard } from '@/components/common';
import { formatCurrency } from '@/lib/utils';

interface SellerDashboardClientProps {
  stats: SellerStats;
  recentBatches: RecentBatch[];
}

export function SellerDashboardClient({ stats, recentBatches }: SellerDashboardClientProps) {
  return (
    <div className="w-full space-y-2">
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Statistics</h2>
        <div className="grid grid-cols-2 gap-1 md:grid-cols-2 lg:grid-cols-4">
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
            description="Capital at work"
          />
          <StatCard
            title="Problem Cards"
            value={stats.problemCards.toString()}
            icon={<IconAlertTriangle className={`h-6 w-6 ${stats.problemCards > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />}
            description="Invalid / Already used / Wrong amount"
          />
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between p-1">
          <h2 className="text-xl font-semibold">Recent Batches</h2>
          <div className="flex items-center gap-2">
            <Link
              href="/sell/dashboard/sell-cards"
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
        <div className="grid grid-cols-1 gap-1 md:grid-cols-2 lg:grid-cols-3">
          {recentBatches.length > 0 ? (
            recentBatches.map((batch) => (
              <Card key={batch.id}>
                <CardHeader className="flex flex-row items-center gap-1">
                  {batch.giftcards[0]?.brand.image ? (
                    <div className="relative h-10 w-10">
                      <Image src={batch.giftcards[0].brand.image} alt={batch.giftcards[0].brand.name} fill className="object-contain" />
                    </div>
                  ) : (
                    <span className="text-2xl">{batch.giftcards[0]?.brand.icon || '🎁'}</span>
                  )}
                  <div>
                    <CardTitle className="text-base">Batch #{batch.id}</CardTitle>
                    <CardDescription>
                      {batch.cardsCount} cards · {new Date(batch.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold">{formatCurrency(batch.effectiveTotal)}</p>
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${batch.isPaid ? 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-500' : 'border border-amber-500/30 bg-amber-500/20 text-amber-500'}`}
                    >
                      {batch.isPaid ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full">
              <CardHeader>
                <div className="flex items-center gap-1">
                  <IconGift className="text-muted-foreground h-6 w-6" />
                  <CardDescription>No batches yet. Start selling cards to see them here.</CardDescription>
                </div>
              </CardHeader>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
