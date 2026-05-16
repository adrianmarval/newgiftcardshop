import { getSession } from '@/lib/authorization';
import { Metadata } from 'next';
import { buyerStats } from '@/actions/order/buyer-stats';
import { getBuyerOrders } from '@/actions/order/list';
import { BuyerDashboardClient } from '@/components/buy/buyer-dashboard-client';
import type { BuyerStats as BuyerStatsType } from '@/types/domain/order';
import type { BuyerOrder } from '@/types/domain/order';

export const metadata: Metadata = {
  title: `Dashboard de Comprador | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Explora y compra tarjetas de regalo con descuento en ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
};

export default async function BuyerDashboardPage() {
  const session = await getSession();

  const [statsResult, ordersResult] = await Promise.all([buyerStats(), getBuyerOrders({ page: 1, limit: 3, status: 'PENDING' })]);

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
    <div className="container mx-auto space-y-4 py-2">
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-bold">Bienvenido{session.user.name ? `, ${session.user.name}` : ''}</h1>
        <p className="text-muted-foreground">Explora y compra tarjetas de regalo con descuento</p>
      </div>

      <BuyerDashboardClient stats={stats} activeOrders={activeOrders} />
    </div>
  );
}
