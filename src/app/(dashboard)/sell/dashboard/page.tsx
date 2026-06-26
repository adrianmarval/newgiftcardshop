import { getSession } from '@/lib/auth/authorization';
import { Metadata } from 'next';
import { getSellerStats } from '@/actions/seller/stats';
import { recentBatches } from '@/actions/seller/batches';
import { SellerDashboardClient } from '@/components/sell/seller-dashboard-client';
import type { SellerStats as SellerStatsType } from '@/types';
import type { RecentBatch } from '@/types';

export const metadata: Metadata = {
  title: `Seller Dashboard | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Manage your gift cards and track your sales on ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
};

export default async function SellerDashboardPage() {
  const [statsResult, batchesResult] = await Promise.all([getSellerStats(), recentBatches()]);

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
    <div className="w-full space-y-1">
      <h1 className="flex justify-center text-4xl font-black tracking-tighter italic md:text-5xl">SELLER DASHBOARD</h1>

      <SellerDashboardClient stats={stats} recentBatches={recentBatchesList} />
    </div>
  );
}
