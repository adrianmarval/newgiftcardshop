'use server';

import prisma from '@/lib/prisma';
import { sellerActionClient } from '@/lib/safe-action';
import { upsertPaymentMethodInputSchema, upsertPaymentMethodOutputSchema } from './schemas';
import { getCoinWithNetworks, validateWalletAddress } from '@/lib/services/coin';
import { ActionError } from '@/lib/safe-action';

export const upsertPaymentMethod = sellerActionClient
  .inputSchema(upsertPaymentMethodInputSchema)
  .outputSchema(upsertPaymentMethodOutputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const userId = ctx.auth.user.id;
    const { coinId, networkId, address, isBinanceWallet } = parsedInput;

    // Validate coin+network combination exists
    const coin = await getCoinWithNetworks(coinId);
    if (!coin) throw new ActionError('Invalid coin');
    const networkLink = coin.networks.find((cn) => cn.networkId === networkId);
    if (!networkLink) throw new ActionError('Network not linked to this coin');

    // Validate address format
    if (!validateWalletAddress(address, networkLink.network.regex)) {
      throw new ActionError(`Invalid wallet address for ${networkLink.network.name}`);
    }

    const pm = await prisma.paymentMethod.upsert({
      where: { userId },
      create: { userId, coinId, networkId, address, isBinanceWallet },
      update: { coinId, networkId, address, isBinanceWallet },
      include: { coin: true, network: true },
    });

    return {
      success: true as const,
      paymentMethod: {
        id: pm.id,
        coinId: pm.coinId,
        networkId: pm.networkId,
        address: pm.address,
        isBinanceWallet: pm.isBinanceWallet,
        updatedAt: pm.updatedAt,
        coin: { id: pm.coin.id, name: pm.coin.name, symbol: pm.coin.symbol, decimals: pm.coin.decimals },
        network: { id: pm.network.id, name: pm.network.name, description: pm.network.description, regex: pm.network.regex },
      },
    };
  });
