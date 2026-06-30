import prisma from '@/lib/prisma';
import type { CoinWithNetworks, BlockchainNetwork } from '@/types';

let cache: { coins: CoinWithNetworks[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

export async function getCoinCatalog(): Promise<CoinWithNetworks[]> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.coins;
  const coins = await prisma.coin.findMany({
    include: {
      networks: {
        include: { network: true },
        where: { network: { isActive: true } },
      },
    },
    where: { isActive: true },
    orderBy: { symbol: 'asc' },
  });
  cache = { coins: coins as CoinWithNetworks[], ts: Date.now() };
  return cache.coins;
}

export async function getNetworkById(id: string): Promise<BlockchainNetwork | null> {
  return prisma.network.findUnique({ where: { id } }) as Promise<BlockchainNetwork | null>;
}

export async function getCoinWithNetworks(coinId: string): Promise<CoinWithNetworks | null> {
  return prisma.coin.findUnique({
    where: { id: coinId },
    include: {
      networks: {
        include: { network: true },
      },
    },
  }) as Promise<CoinWithNetworks | null>;
}

export function validateWalletAddress(address: string, regex: string): boolean {
  return new RegExp(regex).test(address);
}

export function invalidateCache(): void {
  cache = null;
}
