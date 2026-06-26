'use server';

import { adminActionClient } from '@/lib/safe-action';
import binance from '@/lib/services/payment/binance.service';
import { z } from 'zod';

const getBinanceBalancesOutputSchema = z.object({
  spot: z.string(),
  funding: z.string(),
  total: z.string(),
});

export const getBinanceBalances = adminActionClient.outputSchema(getBinanceBalancesOutputSchema).action(async () => {
  return await binance.getUsdtBalances();
});
