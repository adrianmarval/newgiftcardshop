'use server';

import prisma from '@/lib/prisma';
import { sellerActionClient } from '@/lib/safe-action';
import { getPaymentMethodOutputSchema } from './schemas';

export const getPaymentMethod = sellerActionClient
  .outputSchema(getPaymentMethodOutputSchema)
  .action(async ({ ctx }) => {
    const userId = ctx.auth.user.id;
    const pm = await prisma.paymentMethod.findUnique({
      where: { userId },
      include: { coin: true, network: true },
    });

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
