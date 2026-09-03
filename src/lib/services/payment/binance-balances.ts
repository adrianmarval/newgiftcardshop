import { unstable_cache } from 'next/cache';
import binance from './binance.service';

// Cache 15s: evita 2 llamadas HTTP firmadas a Binance (Spot + Funding) en cada
// carga del dashboard. El balance no necesita frescura al segundo.
// Compartido entre la server action (primer paint) y el route handler
// /api/query/binance-balances (refetch client-side).
export const getCachedUsdtBalances = unstable_cache(
  () => binance.getUsdtBalances(),
  ['binance-usdt-balances'],
  { revalidate: 15 },
);
