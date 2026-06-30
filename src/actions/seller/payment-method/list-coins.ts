'use server';

import { sellerActionClient } from '@/lib/safe-action';
import { getCoinCatalog } from '@/lib/services/coin';
import { z } from 'zod';

const coinOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  isActive: z.boolean(),
  networks: z.array(
    z.object({
      id: z.string(),
      coinId: z.string(),
      networkId: z.string(),
      network: z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        regex: z.string(),
        isActive: z.boolean(),
      }),
    }),
  ),
});

const listCoinsForSellerOutputSchema = z.object({
  success: z.literal(true),
  coins: z.array(coinOutputSchema),
});

export const listCoinsForSeller = sellerActionClient
  .outputSchema(listCoinsForSellerOutputSchema)
  .action(async () => {
    const coins = await getCoinCatalog();
    return {
      success: true as const,
      coins: coins.map((c) => ({
        id: c.id,
        name: c.name,
        symbol: c.symbol,
        decimals: c.decimals,
        isActive: c.isActive,
        networks: c.networks.map((cn) => ({
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
