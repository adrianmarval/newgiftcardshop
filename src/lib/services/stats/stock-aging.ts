import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';

// Buckets pensados para un mercado veloz: la granularidad fina está en horas,
// no en días. >3d es inventario críticamente varado.
const AGE_BUCKETS = [
  { range: '<1h', countKey: 'lt1hCount', totalKey: 'lt1hTotal' },
  { range: '1-6h', countKey: 'h1to6Count', totalKey: 'h1to6Total' },
  { range: '6-24h', countKey: 'h6to24Count', totalKey: 'h6to24Total' },
  { range: '1-3d', countKey: 'd1to3Count', totalKey: 'd1to3Total' },
  { range: '>3d', countKey: 'gt3dCount', totalKey: 'gt3dTotal' },
] as const;

interface AgingRow {
  brandCountryId: string;
  brandName: string;
  countryName: string;
  countryCode: string;
  totalCards: number;
  totalAmount: number;
  oldestHours: number;
  lt1hCount: number;
  lt1hTotal: number;
  h1to6Count: number;
  h1to6Total: number;
  h6to24Count: number;
  h6to24Total: number;
  d1to3Count: number;
  d1to3Total: number;
  gt3dCount: number;
  gt3dTotal: number;
}

// Agregación completa en la DB (una fila por brand-country) en vez de traer
// todo el stock a Node. Cache 60s — reporte solo-admin.
const fetchStockAging = unstable_cache(
  async (): Promise<AgingRow[]> => {
    return prisma.$queryRaw<AgingRow[]>`
      WITH aged AS (
        SELECT
          g."brandCountryId",
          g.amount::float8 AS amount,
          -- now() AT TIME ZONE 'UTC' = wall-clock UTC; createdAt es TIMESTAMP sin tz
          -- con wall-clock UTC (convención Prisma) -> resta correcta sin importar
          -- la timezone de la sesión de la DB
          EXTRACT(EPOCH FROM ((now() AT TIME ZONE 'UTC') - g."createdAt")) / 3600.0 AS age_hours
        FROM giftcard g
        WHERE g."inStock" = true AND g.status = 'UNUSED'
      )
      SELECT
        a."brandCountryId",
        br.name AS "brandName",
        co.name AS "countryName",
        co.code AS "countryCode",
        COUNT(*)::int AS "totalCards",
        COALESCE(SUM(a.amount), 0)::float8 AS "totalAmount",
        COALESCE(MAX(a.age_hours), 0)::float8 AS "oldestHours",
        COUNT(*) FILTER (WHERE a.age_hours < 1)::int AS "lt1hCount",
        COALESCE(SUM(a.amount) FILTER (WHERE a.age_hours < 1), 0)::float8 AS "lt1hTotal",
        COUNT(*) FILTER (WHERE a.age_hours >= 1 AND a.age_hours < 6)::int AS "h1to6Count",
        COALESCE(SUM(a.amount) FILTER (WHERE a.age_hours >= 1 AND a.age_hours < 6), 0)::float8 AS "h1to6Total",
        COUNT(*) FILTER (WHERE a.age_hours >= 6 AND a.age_hours < 24)::int AS "h6to24Count",
        COALESCE(SUM(a.amount) FILTER (WHERE a.age_hours >= 6 AND a.age_hours < 24), 0)::float8 AS "h6to24Total",
        COUNT(*) FILTER (WHERE a.age_hours >= 24 AND a.age_hours < 72)::int AS "d1to3Count",
        COALESCE(SUM(a.amount) FILTER (WHERE a.age_hours >= 24 AND a.age_hours < 72), 0)::float8 AS "d1to3Total",
        COUNT(*) FILTER (WHERE a.age_hours >= 72)::int AS "gt3dCount",
        COALESCE(SUM(a.amount) FILTER (WHERE a.age_hours >= 72), 0)::float8 AS "gt3dTotal"
      FROM aged a
      JOIN brand_country bc ON bc.id = a."brandCountryId"
      JOIN brand br ON br.id = bc."brandId"
      JOIN country co ON co.id = bc."countryId"
      GROUP BY a."brandCountryId", br.name, co.name, co.code
      ORDER BY "oldestHours" DESC
    `;
  },
  ['admin-stock-aging-report'],
  { revalidate: 60 },
);

export async function getStockAgingReport() {
  const rows = await fetchStockAging();

  return rows.map((row) => ({
    brandCountryId: row.brandCountryId,
    brandName: row.brandName,
    countryName: row.countryName,
    countryCode: row.countryCode,
    totalCards: row.totalCards,
    totalAmount: Number(row.totalAmount.toFixed(2)),
    oldestHours: Number(row.oldestHours.toFixed(1)),
    buckets: AGE_BUCKETS.map((bucket) => ({
      range: bucket.range,
      count: row[bucket.countKey],
      total: Number(row[bucket.totalKey].toFixed(2)),
    })),
  }));
}
