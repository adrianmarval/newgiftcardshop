'use server';

import { adminActionClient } from '@/lib/safe-action';
import prisma from '@/lib/prisma';
import { startOfDay, startOfWeek, startOfMonth, subDays, format } from 'date-fns';

export const getProfitStatsAction = adminActionClient.action(async () => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const thirtyDaysAgo = subDays(todayStart, 29); // Last 30 days including today

  // Consideramos vendidas a aquellas asociadas a una orden COMPLETED.
  const soldGiftcards = await prisma.giftcard.findMany({
    where: {
      orderId: { not: null },
      order: {
        status: 'COMPLETED',
        createdAt: { gte: thirtyDaysAgo },
      },
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

  const chartMap: Record<string, number> = {};

  // Inicializar los últimos 30 días en 0
  for (let i = 0; i < 30; i++) {
    const d = subDays(todayStart, 29 - i);
    chartMap[format(d, 'yyyy-MM-dd')] = 0;
  }

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

    // Profit = (lo que paga el buyer) - (lo que se le paga al seller)
    const profit = effectiveAmount * buyRate - effectiveAmount * sellRate;

    const saleDate = gc.order.createdAt;

    if (saleDate >= todayStart) {
      todayProfit += profit;
      todayVolume += effectiveAmount;
    }
    if (saleDate >= weekStart) weekProfit += profit;
    if (saleDate >= monthStart) monthProfit += profit;

    const dateStr = format(saleDate, 'yyyy-MM-dd');
    if (chartMap[dateStr] !== undefined) {
      chartMap[dateStr] += profit;
    }
  }

  const chartData = Object.entries(chartMap).map(([date, profit]) => ({
    date,
    profit: Number(profit.toFixed(2)),
  }));

  return {
    summary: {
      today: Number(todayProfit.toFixed(2)),
      week: Number(weekProfit.toFixed(2)),
      month: Number(monthProfit.toFixed(2)),
      todayVolume: Number(todayVolume.toFixed(2)),
    },
    chartData,
  };
});
