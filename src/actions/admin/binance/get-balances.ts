'use server';

import { adminActionClient } from '@/lib/safe-action';
import binance from '@/lib/services/binance.service';

export const getBinanceBalances = adminActionClient.action(async () => {
  return await binance.getUsdtBalances();
});
