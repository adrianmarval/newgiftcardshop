import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';

const BUCKET_ORDER = ['<5', '5-9.99', '10-14.99', '15-19.99', '20-24.99', '>=25'] as const;

interface InventoryRow {
  range: string;
  count: number;
  total: number;
}

// Agregación en la DB: devuelve máximo 6 filas en vez de traer todo el stock a Node.
// Cache 60s — data solo-admin, idéntica para todos los admins.
const fetchInventoryBuckets = unstable_cache(
  async (): Promise<InventoryRow[]> => {
    return prisma.$queryRaw<InventoryRow[]>`
      SELECT
        CASE
          WHEN amount < 5 THEN '<5'
          WHEN amount < 10 THEN '5-9.99'
          WHEN amount < 15 THEN '10-14.99'
          WHEN amount < 20 THEN '15-19.99'
          WHEN amount < 25 THEN '20-24.99'
          ELSE '>=25'
        END AS range,
        COUNT(*)::int AS count,
        COALESCE(SUM(amount), 0)::float8 AS total
      FROM giftcard
      WHERE "inStock" = true
      GROUP BY 1
    `;
  },
  ['admin-inventory-stats'],
  { revalidate: 60 },
);

export async function getInventoryStats() {
  const rows = await fetchInventoryBuckets();
  const byRange = new Map(rows.map((row) => [row.range, row]));

  // Preservar el orden fijo de buckets y rellenar con ceros los rangos sin stock
  return BUCKET_ORDER.map((range) => ({
    range,
    count: byRange.get(range)?.count ?? 0,
    total: Number((byRange.get(range)?.total ?? 0).toFixed(2)),
  }));
}
