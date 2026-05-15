import { getSession } from '@/lib/authorization';
import { Metadata } from 'next';
import { sellerStats } from '@/actions/seller/seller-stats';
import { recentBatches } from '@/actions/seller/recent-batches';
import { SellerDashboardClient } from '@/components/sell/seller-dashboard-client';
import type { SellerStats as SellerStatsType } from '@/types/domain/seller';
import type { RecentBatch } from '@/types/domain/seller';

export const metadata: Metadata = {
  title: `Seller Dashboard | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Manage your gift cards and track your sales on ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
};

export default async function SellerDashboardPage() {
  const session = await getSession();

  const [statsResult, batchesResult] = await Promise.all([sellerStats(), recentBatches()]);

  if (!statsResult.data) {
    throw new Error('Failed to load seller stats');
  }
  if (!batchesResult.data) {
    throw new Error('Failed to load recent batches');
  }

  const stats: SellerStatsType = {
    totalCards: statsResult.data.totalCards,
    totalBatches: statsResult.data.totalBatches,
    paidBatches: statsResult.data.paidBatches,
    unpaidBatches: statsResult.data.unpaidBatches,
  };

  const recentBatchesList: RecentBatch[] = batchesResult.data.map((batch) => ({
    id: batch.id,
    sellRate: batch.sellRate,
    isPaid: batch.isPaid,
    createdAt: batch.createdAt,
    giftcards: batch.giftcards,
    cardsCount: batch.cardsCount,
    effectiveTotal: batch.effectiveTotal,
  }));

  return (
    <div className="container mx-auto space-y-4 py-2">
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-bold">Welcome back{session.user.name ? `, ${session.user.name}` : ''}</h1>
        <p className="text-muted-foreground">Manage your gift cards and track your sales</p>
      </div>

      <SellerDashboardClient stats={stats} recentBatches={recentBatchesList} />
    </div>
  );
}
