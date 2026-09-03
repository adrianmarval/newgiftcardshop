'use server';

import { adminActionClient } from '@/lib/safe-action';
import { getCachedUsdtBalances } from '@/lib/services/payment/binance-balances';
import { getBinanceBalancesOutputSchema } from './schemas';

export const getBinanceBalances = adminActionClient
  .outputSchema(getBinanceBalancesOutputSchema)
  .action(async () => {
    return await getCachedUsdtBalances();
  });
