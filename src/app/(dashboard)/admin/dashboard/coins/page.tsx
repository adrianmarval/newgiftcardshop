import { listCoins, listNetworks } from '@/actions/admin/coins';
import { CoinsManager } from '@/components/admin/coins';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Coins & Networks | Admin',
};

export default async function CoinsPage() {
  const [coinsResult, networksResult] = await Promise.all([listCoins(), listNetworks()]);

  if (!coinsResult.data?.success) throw new Error('Failed to load coins');
  if (!networksResult.data?.success) throw new Error('Failed to load networks');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Coins &amp; Networks</h1>
      <CoinsManager initialCoins={coinsResult.data.coins} initialNetworks={networksResult.data.networks} />
    </div>
  );
}
