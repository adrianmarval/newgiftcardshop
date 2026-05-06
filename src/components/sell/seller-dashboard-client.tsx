'use client';

import Link from 'next/link';
import Image from 'next/image';
import { IconPlus, IconGift, IconCreditCard, IconPackage, IconCircleCheck, IconClock } from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { SellerStats, RecentBatch } from '@/types/domain/seller';
import { StatCard } from '@/components/ui/stat-card';

interface SellerDashboardClientProps {
  stats: SellerStats;
  recentBatches: RecentBatch[];
}

export function SellerDashboardClient({ stats, recentBatches }: SellerDashboardClientProps) {
  return (
    <div className="container mx-auto space-y-4">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Statistics</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Cards"
            value={stats.totalCards.toString()}
            icon={<IconCreditCard className="text-muted-foreground h-6 w-6" />}
          />
          <StatCard
            title="Total Batches"
            value={stats.totalBatches.toString()}
            icon={<IconPackage className="text-muted-foreground h-6 w-6" />}
          />
          <StatCard
            title="Total Paid Amount"
            value={stats.paidBatches.toString()}
            icon={<IconCircleCheck className="h-6 w-6 text-green-500" />}
          />
          <StatCard
            title="Pending Batches"
            value={stats.unpaidBatches.toString()}
            icon={<IconClock className="h-6 w-6 text-yellow-500" />}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sell Gift Cards</CardTitle>
                <CardDescription>Create a new batch and start selling</CardDescription>
              </div>
              <Link
                href="/sell/dashboard/sell-cards"
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 font-medium"
              >
                <IconPlus className="h-4 w-4" />
                Sell Cards
              </Link>
            </div>
          </CardHeader>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Batches</h2>
          <Link href="/sell/dashboard/cards" className="text-primary text-sm hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recentBatches.length > 0 ? (
            recentBatches.map((batch) => (
              <Card key={batch.id}>
                <CardHeader className="flex flex-row items-center gap-3">
                  {batch.giftcards[0]?.brand.image ? (
                    <div className="relative h-10 w-10">
                      <Image src={batch.giftcards[0].brand.image} alt={batch.giftcards[0].brand.name} fill className="object-contain" />
                    </div>
                  ) : (
                    <span className="text-2xl">{batch.giftcards[0]?.brand.icon || '🎁'}</span>
                  )}
                  <div>
                    <CardTitle className="text-base">Batch #{batch.id}</CardTitle>
                    <CardDescription>{batch.cardsCount} cards</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold">${batch.effectiveTotal}</p>
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        batch.isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}
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
                <div className="flex items-center gap-3">
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
