'use server';

import { sellerActionClient } from '@/lib/safe-action';
import { upsertPaymentMethodInputSchema, upsertPaymentMethodOutputSchema } from './schemas';
import { upsertWallet, WalletError } from '@/lib/services/payment/wallet';
import { ActionError } from '@/lib/safe-action';

export const upsertPaymentMethod = sellerActionClient
  .inputSchema(upsertPaymentMethodInputSchema)
  .outputSchema(upsertPaymentMethodOutputSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const pm = await upsertWallet({ userId: ctx.auth.user.id, ...parsedInput });

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
    } catch (error) {
      if (error instanceof WalletError) throw new ActionError(error.message);
      throw error;
    }
  });
