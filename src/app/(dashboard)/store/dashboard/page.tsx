import { getSession } from '@/lib/authorization';
import { Metadata } from 'next';
import { buyerStats } from '@/actions/buyer/stats/buyer-stats';
import { listOrders } from '@/actions/buyer/orders/list-orders';
import { BuyerDashboard } from '@/components/buy/buyer-dashboard';
import type { BuyerStats as BuyerStatsType } from '@/types/domain/order';
import type { BuyerOrder } from '@/types/domain/order';

export const metadata: Metadata = {
  title: `Dashboard de Comprador | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Explora y compra tarjetas de regalo con descuento en ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
};

export default async function BuyerDashboardPage() {
  const session = await getSession();

  const [statsResult, ordersResult] = await Promise.all([buyerStats(), listOrders({ page: 1, limit: 3, status: 'PENDING' })]);

  if (!statsResult.data) {
    throw new Error('Failed to load buyer stats');
  }

  const stats: BuyerStatsType = {
    availableCards: statsResult.data.availableCards,
    myOrders: statsResult.data.myOrders,
    activeOrders: statsResult.data.activeOrders,
    totalSaved: statsResult.data.totalSaved,
  };

  let activeOrders: BuyerOrder[] = [];
  if (ordersResult.data?.success) {
    activeOrders = ordersResult.data.items as BuyerOrder[];
  }

  return (
    <div className="w-full space-y-4">
      <h1 className="flex justify-center text-4xl font-black tracking-tighter italic md:text-5xl">BUYER DASHBOARD</h1>

      <BuyerDashboard stats={stats} activeOrders={activeOrders} />
    </div>
  );
}
