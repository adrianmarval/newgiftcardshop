'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { listNetworksOutputSchema } from './schemas';
import { invalidateCache } from '@/lib/services/coin';

export const listNetworks = adminActionClient
  .outputSchema(listNetworksOutputSchema)
  .action(async () => {
    const networks = await prisma.network.findMany({
      orderBy: { name: 'asc' },
      include: {
        coins: {
          include: { coin: true },
        },
      },
    });

    invalidateCache();

    return {
      success: true as const,
      networks: networks.map((net) => ({
        id: net.id,
        name: net.name,
        description: net.description,
        regex: net.regex,
        isActive: net.isActive,
        coins: net.coins.map((cn) => ({
          id: cn.id,
          coinId: cn.coinId,
          networkId: cn.networkId,
          coin: {
            id: cn.coin.id,
            name: cn.coin.name,
            symbol: cn.coin.symbol,
            decimals: cn.coin.decimals,
            isActive: cn.coin.isActive,
          },
        })),
      })),
    };
  });
