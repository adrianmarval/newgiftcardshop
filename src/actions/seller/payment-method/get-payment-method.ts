'use server';

import { sellerActionClient } from '@/lib/safe-action';
import { getPaymentMethodOutputSchema } from './schemas';
import { getWallet } from '@/lib/services/payment/wallet';

export const getPaymentMethod = sellerActionClient
  .outputSchema(getPaymentMethodOutputSchema)
  .action(async ({ ctx }) => {
    const pm = await getWallet(ctx.auth.user.id);

    return {
      success: true as const,
      paymentMethod: pm
        ? {
            id: pm.id,
            coinId: pm.coinId,
            networkId: pm.networkId,
            address: pm.address,
            isBinanceWallet: pm.isBinanceWallet,
            updatedAt: pm.updatedAt,
            coin: { id: pm.coin.id, name: pm.coin.name, symbol: pm.coin.symbol, decimals: pm.coin.decimals },
            network: { id: pm.network.id, name: pm.network.name, description: pm.network.description, regex: pm.network.regex },
          }
        : null,
    };
  });
