'use server';

import { adminActionClient } from '@/lib/safe-action';
import binance from '@/lib/services/payment/binance.service';
import { getBinanceBalancesOutputSchema } from './schemas';

export const getBinanceBalances = adminActionClient
  .outputSchema(getBinanceBalancesOutputSchema)
  .action(async () => {
    return await binance.getUsdtBalances();
  });