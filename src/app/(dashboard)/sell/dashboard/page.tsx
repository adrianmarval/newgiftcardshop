
import { Metadata } from 'next';
import { getSellerStats } from '@/actions/seller/stats';
import { recentBatches } from '@/actions/seller/batches';
import { SellerDashboardClient } from '@/components/sell/seller-dashboard-client';
import type { SellerStats } from '@/types';
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

  const stats: SellerStats = {
    pendingPayout: statsResult.data.pendingPayout,
    totalEarned: statsResult.data.totalEarned,
    inStockValue: statsResult.data.inStockValue,
    problemCards: statsResult.data.problemCards,
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
    <div className="w-full">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Seller Dashboard</h1>

      <SellerDashboardClient stats={stats} recentBatches={recentBatchesList} />
    </div>
  );
}
