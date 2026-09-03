'use server';

import { unstable_cache } from 'next/cache';
import { adminActionClient, ActionError } from '@/lib/safe-action';
import prisma from '@/lib/prisma';
import { startOfDay, startOfWeek, startOfMonth, subDays, subMonths, format } from 'date-fns';
import { getProfitStatsOutputSchema } from './schemas';

interface DailyProfitRow {
  dayKey: string;
  profit: number;
  volume: number;
}

// Timezone del servidor, para que el bucketing por día en SQL matchee exactamente
// el bucketing que antes hacía date-fns en Node (mismo comportamiento que antes).
const SERVER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

// Monto efectivo de la venta (misma regla de negocio que antes):
// WRONG_AMOUNT con reportedAmount -> reportedAmount; INVALID/ALREADY_USED/DEACTIVATED -> 0; resto -> amount
// Se inlinnea en el template (los `${}` de $queryRaw son PARÁMETROS, no fragmentos SQL)
// Agregación por día en la DB: la historia completa de ventas colapsa a ~365 filas/año
// en vez de traer TODAS las giftcards vendidas a Node. Cache 60s — data solo-admin.
const fetchDailyProfit = unstable_cache(
  async (): Promise<DailyProfitRow[]> => {
    return prisma.$queryRaw<DailyProfitRow[]>`
      SELECT
        -- createdAt es TIMESTAMP(3) sin tz y Prisma escribe el wall-clock UTC:
        -- AT TIME ZONE 'UTC' lo reinterpreta como instante real, y el segundo
        -- AT TIME ZONE lo convierte al wall-clock local del servidor (mismo
        -- bucketing por día que hacía date-fns en Node antes de esta query)
        to_char((o."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${SERVER_TZ}, 'YYYY-MM-DD') AS "dayKey",
        SUM(
          (CASE
            WHEN g.status = 'WRONG_AMOUNT' AND g."reportedAmount" IS NOT NULL THEN g."reportedAmount"
            WHEN g.status IN ('INVALID', 'ALREADY_USED', 'DEACTIVATED') THEN 0
            ELSE g.amount
          END) * (o."buyRate" - b."sellRate")
        )::float8 AS profit,
        SUM(
          CASE
            WHEN g.status = 'WRONG_AMOUNT' AND g."reportedAmount" IS NOT NULL THEN g."reportedAmount"
            WHEN g.status IN ('INVALID', 'ALREADY_USED', 'DEACTIVATED') THEN 0
            ELSE g.amount
          END
        )::float8 AS volume
      FROM giftcard g
      JOIN "order" o ON o.id = g."orderId"
      JOIN giftcard_batch b ON b.id = g."batchId"
      WHERE o.status = 'COMPLETED' AND g."batchId" IS NOT NULL
      GROUP BY 1
      ORDER BY 1
    `;
  },
  ['admin-profit-stats'],
  { revalidate: 60 },
);

export const getProfitStats = adminActionClient.outputSchema(getProfitStatsOutputSchema).action(async () => {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);

    // Límites como day keys ISO (comparación lexicográfica válida en YYYY-MM-DD)
    const todayKey = format(todayStart, 'yyyy-MM-dd');
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    const monthKey = format(monthStart, 'yyyy-MM-dd');

    const dailyRows = await fetchDailyProfit();

    let todayProfit = 0;
    let weekProfit = 0;
    let monthProfit = 0;
    let todayVolume = 0;

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
      const { dayKey, profit, volume } = row;

      if (dayKey >= todayKey) {
        todayProfit += profit;
        todayVolume += volume;
      }
      if (dayKey >= weekKey) weekProfit += profit;
      if (dayKey >= monthKey) monthProfit += profit;

      if (dailyMap[dayKey] !== undefined) dailyMap[dayKey] += profit;

      const rowMonthKey = dayKey.slice(0, 7);
      if (monthlyMap[rowMonthKey] !== undefined) monthlyMap[rowMonthKey] += profit;

      yearlyMap[dayKey.slice(0, 4)] += profit;
    }

    const toChartData = (map: Record<string, number>) =>
      Object.entries(map).map(([date, profit]) => ({ date, profit: Number(profit.toFixed(2)) }));

    return {
      summary: {
        today: Number(todayProfit.toFixed(2)),
        week: Number(weekProfit.toFixed(2)),
        month: Number(monthProfit.toFixed(2)),
        todayVolume: Number(todayVolume.toFixed(2)),
      },
      charts: {
        daily: toChartData(dailyMap),
        monthly: toChartData(monthlyMap),
        yearly: toChartData(yearlyMap),
      },
    };
  } catch (error) {
    console.error('[getProfitStats]', error);
    throw new ActionError('Error al obtener las estadísticas de ganancias.');
  }
});
