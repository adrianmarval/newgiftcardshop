import { unstable_cache } from 'next/cache';
import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { startOfDay, startOfWeek, startOfMonth, subDays, subMonths, format } from 'date-fns';

interface DailyVolumeRow {
  dayKey: string;
  volume: number;
}

// Timezone del servidor (mismo bucketing por día que admin-profit-stats — ver
// el comentario detallado del AT TIME ZONE doble ahí).
const SERVER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

// Monto efectivo de la venta (misma regla de negocio que profit-stats):
// WRONG_AMOUNT con reportedAmount -> reportedAmount; INVALID/ALREADY_USED/DEACTIVATED -> 0; resto -> amount
// Agregación por día en la DB: la historia completa colapsa a ~365 filas/año.
// Cache 60s POR brandCountryId (los args de unstable_cache entran en la key) —
// cada filtro del chart tiene su propia entrada, data solo-admin.
const fetchDailyVolume = unstable_cache(
  async (brandCountryId: string | null): Promise<DailyVolumeRow[]> => {
    return prisma.$queryRaw<DailyVolumeRow[]>`
      SELECT
        to_char((o."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${SERVER_TZ}, 'YYYY-MM-DD') AS "dayKey",
        SUM(
          CASE
            WHEN g.status = 'WRONG_AMOUNT' AND g."reportedAmount" IS NOT NULL THEN g."reportedAmount"
            WHEN g.status IN ('INVALID', 'ALREADY_USED', 'DEACTIVATED') THEN 0
            ELSE g.amount
          END
        )::float8 AS volume
      FROM giftcard g
      JOIN "order" o ON o.id = g."orderId"
      WHERE o.status = 'COMPLETED' AND g."batchId" IS NOT NULL
      ${brandCountryId ? Prisma.sql`AND g."brandCountryId" = ${brandCountryId}` : Prisma.empty}
      GROUP BY 1
      ORDER BY 1
    `;
  },
  ['admin-volume-stats'],
  { revalidate: 60 },
);

/**
 * Volumen comerciado (face value vendido en órdenes COMPLETED) con vistas
 * diaria/mensual/anual, global o filtrado por brand-country. Alimenta el
 * VolumeChart del admin dashboard.
 */
export async function getVolumeStats(brandCountryId: string | null = null) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  // Límites como day keys ISO (comparación lexicográfica válida en YYYY-MM-DD)
  const todayKey = format(todayStart, 'yyyy-MM-dd');
  const weekKey = format(weekStart, 'yyyy-MM-dd');
  const monthKey = format(monthStart, 'yyyy-MM-dd');

  const dailyRows = await fetchDailyVolume(brandCountryId);

  let todayVolume = 0;
  let weekVolume = 0;
  let monthVolume = 0;

  // Buckets: 30 días (diario), 12 meses (mensual), desde la primera venta (anual)
  const dailyMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    dailyMap[format(subDays(todayStart, 29 - i), 'yyyy-MM-dd')] = 0;
  }

  const monthlyMap: Record<string, number> = {};
  for (let i = 0; i < 12; i++) {
    monthlyMap[format(subMonths(todayStart, 11 - i), 'yyyy-MM')] = 0;
  }

  const currentYear = now.getFullYear();
  const firstYear = dailyRows.length > 0 ? Number(dailyRows[0].dayKey.slice(0, 4)) : currentYear;
  const yearlyMap: Record<string, number> = {};
  for (let y = firstYear; y <= currentYear; y++) {
    yearlyMap[String(y)] = 0;
  }

  for (const row of dailyRows) {
    const { dayKey, volume } = row;

    if (dayKey >= todayKey) todayVolume += volume;
    if (dayKey >= weekKey) weekVolume += volume;
    if (dayKey >= monthKey) monthVolume += volume;

    if (dailyMap[dayKey] !== undefined) dailyMap[dayKey] += volume;

    const rowMonthKey = dayKey.slice(0, 7);
    if (monthlyMap[rowMonthKey] !== undefined) monthlyMap[rowMonthKey] += volume;

    yearlyMap[dayKey.slice(0, 4)] += volume;
  }

  const toChartData = (map: Record<string, number>) =>
    Object.entries(map).map(([date, volume]) => ({ date, volume: Number(volume.toFixed(2)) }));

  return {
    summary: {
      today: Number(todayVolume.toFixed(2)),
      week: Number(weekVolume.toFixed(2)),
      month: Number(monthVolume.toFixed(2)),
    },
    charts: {
      daily: toChartData(dailyMap),
      monthly: toChartData(monthlyMap),
      yearly: toChartData(yearlyMap),
    },
  };
}
