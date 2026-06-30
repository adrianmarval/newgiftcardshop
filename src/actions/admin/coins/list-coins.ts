'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { listCoinsOutputSchema } from './schemas';
import { invalidateCache } from '@/lib/services/coin';

export const listCoins = adminActionClient
  .outputSchema(listCoinsOutputSchema)
  .action(async () => {
    const coins = await prisma.coin.findMany({
      orderBy: { symbol: 'asc' },
      include: {
        networks: {
          include: { network: true },
        },
      },
    });

    invalidateCache();

    return {
      success: true as const,
      coins: coins.map((coin) => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        decimals: coin.decimals,
        isActive: coin.isActive,
        networks: coin.networks.map((cn) => ({
          id: cn.id,
          coinId: cn.coinId,
          networkId: cn.networkId,
          network: {
            id: cn.network.id,
            name: cn.network.name,
            description: cn.network.description,
            regex: cn.network.regex,
            isActive: cn.network.isActive,
          },
        })),
      })),
    };
  });
