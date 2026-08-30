import { Metadata } from 'next';
import { getBuyerStats, getLiveAvailability } from '@/actions/buyer/stats';
import { recentOrders } from '@/actions/buyer/orders';
import { BuyerDashboard } from '@/components/buy/buyer-dashboard';
import type { BuyerStats, RecentOrder } from '@/types';

export const metadata: Metadata = {
  title: `Dashboard de Comprador | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Explora y compra tarjetas de regalo con descuento en ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
};

export default async function BuyerDashboardPage() {
  const [statsResult, ordersResult, availabilityResult] = await Promise.all([
    getBuyerStats(),
    recentOrders(),
    getLiveAvailability(),
  ]);

  if (!statsResult.data) {
    throw new Error('Failed to load buyer stats');
  }
  if (!ordersResult.data) {
    throw new Error('Failed to load recent orders');
  }

  const stats: BuyerStats = {
    orderBook: statsResult.data.orderBook,
    personal: statsResult.data.personal,
  };

  const recentOrdersList: RecentOrder[] = ordersResult.data.map((order) => ({
    id: order.id,
    status: order.status,
    total: order.total,
    adjustedTotal: order.adjustedTotal,
    createdAt: order.createdAt,
    cardsCount: order.cardsCount,
    faceValueTotal: order.faceValueTotal,
    effectiveTotal: order.effectiveTotal,
    giftcards: order.giftcards,
  }));

  return (
    <div className="w-full">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Buyer Dashboard</h1>

      <BuyerDashboard stats={stats} recentOrders={recentOrdersList} availability={availabilityResult.data?.items ?? []} />
    </div>
  );
}
