import { Metadata } from 'next';
import { getBuyerStats } from '@/actions/buyer/stats';
import { BuyerDashboard } from '@/components/buy/buyer-dashboard';
import type { BuyerStats } from '@/types';

export const metadata: Metadata = {
  title: `Dashboard de Comprador | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Explora y compra tarjetas de regalo con descuento en ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
};

export default async function BuyerDashboardPage() {
  const statsResult = await getBuyerStats();

  if (!statsResult.data) {
    throw new Error('Failed to load buyer stats');
  }

  const stats: BuyerStats = {
    availableCards: statsResult.data.availableCards,
    availableAmount: statsResult.data.availableAmount,
    orderBook: statsResult.data.orderBook,
  };

  return (
    <div className="w-full">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Buyer Dashboard</h1>

      <BuyerDashboard stats={stats} />
    </div>
  );
}
