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
    <div className="w-full space-y-1">
      <h1 className="flex justify-center text-4xl font-black tracking-tighter italic md:text-5xl">BUYER DASHBOARD</h1>

      <BuyerDashboard stats={stats} />
    </div>
  );
}
