'use server';

import { unstable_cache } from 'next/cache';
import { adminActionClient } from '@/lib/safe-action';
import binance from '@/lib/services/payment/binance.service';
import { getBinanceBalancesOutputSchema } from './schemas';

// Cache 15s: evita 2 llamadas HTTP firmadas a Binance (Spot + Funding) en cada
// carga del dashboard. El balance no necesita frescura al segundo.
const getCachedUsdtBalances = unstable_cache(
  () => binance.getUsdtBalances(),
  ['binance-usdt-balances'],
  { revalidate: 15 },
);

export const getBinanceBalances = adminActionClient
  .outputSchema(getBinanceBalancesOutputSchema)
  .action(async () => {
    return await getCachedUsdtBalances();
  });
