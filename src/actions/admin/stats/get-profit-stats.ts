'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import prisma from '@/lib/prisma';
import { startOfDay, startOfWeek, startOfMonth, subDays, subMonths, format } from 'date-fns';
import { getProfitStatsOutputSchema } from './schemas';

export const getProfitStats = adminActionClient.outputSchema(getProfitStatsOutputSchema).action(async () => {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);

    // Sin filtro de fecha: el chart anual necesita el historial completo
    const soldGiftcards = await prisma.giftcard.findMany({
      where: {
        orderId: { not: null },
        order: { status: 'COMPLETED' },
        batchId: { not: null },
      },
      select: {
        amount: true,
        reportedAmount: true,
        status: true,
        order: { select: { buyRate: true, createdAt: true } },
        batch: { select: { sellRate: true } },
      },
    });

    let todayProfit = 0;
    let weekProfit = 0;
    let monthProfit = 0;
    let todayVolume = 0;

    const sales: { profit: number; date: Date }[] = [];

    for (const gc of soldGiftcards) {
      if (!gc.order || !gc.batch) continue;

      let effectiveAmount = gc.amount.toNumber();
      if (gc.status === 'WRONG_AMOUNT' && gc.reportedAmount !== null) {
        effectiveAmount = gc.reportedAmount.toNumber();
      } else if (['INVALID', 'ALREADY_USED', 'DEACTIVATED'].includes(gc.status)) {
        effectiveAmount = 0;
      }
      const buyRate = gc.order.buyRate.toNumber();
      const sellRate = gc.batch.sellRate.toNumber();

      const profit = effectiveAmount * buyRate - effectiveAmount * sellRate;
      const saleDate = gc.order.createdAt;

      if (saleDate >= todayStart) {
        todayProfit += profit;
        todayVolume += effectiveAmount;
      }
      if (saleDate >= weekStart) weekProfit += profit;
      if (saleDate >= monthStart) monthProfit += profit;

      sales.push({ profit, date: saleDate });
    }

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
    const firstYear = sales.length > 0 ? Math.min(...sales.map((s) => s.date.getFullYear())) : currentYear;
    const yearlyMap: Record<string, number> = {};
    for (let y = firstYear; y <= currentYear; y++) {
      yearlyMap[String(y)] = 0;
    }

    for (const sale of sales) {
      const dayKey = format(sale.date, 'yyyy-MM-dd');
      if (dailyMap[dayKey] !== undefined) dailyMap[dayKey] += sale.profit;

      const monthKey = format(sale.date, 'yyyy-MM');
      if (monthlyMap[monthKey] !== undefined) monthlyMap[monthKey] += sale.profit;

      yearlyMap[String(sale.date.getFullYear())] += sale.profit;
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
