'use server';

import { adminActionClient } from '@/lib/safe-action';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const getInventoryStatsOutputSchema = z.array(z.object({ range: z.string(), count: z.number(), total: z.number() }));

export const getInventoryStats = adminActionClient.outputSchema(getInventoryStatsOutputSchema).action(async () => {
  const giftcards = await prisma.giftcard.findMany({
    where: { inStock: true },
    select: { amount: true },
  });

  const buckets = [
    { range: '<5', min: 0, max: 4.99, count: 0, total: 0 },
    { range: '5-9.99', min: 5, max: 9.99, count: 0, total: 0 },
    { range: '10-14.99', min: 10, max: 14.99, count: 0, total: 0 },
    { range: '15-19.99', min: 15, max: 19.99, count: 0, total: 0 },
    { range: '20-24.99', min: 20, max: 24.99, count: 0, total: 0 },
    { range: '>=25', min: 25, max: Infinity, count: 0, total: 0 },
  ];

  for (const gc of giftcards) {
    const amount = gc.amount.toNumber();
    for (const bucket of buckets) {
      if (amount >= bucket.min && amount <= bucket.max) {
        bucket.count += 1;
        bucket.total += amount;
        break;
      }
    }
  }

  return buckets.map(({ range, count, total }) => ({ range, count, total: Number(total.toFixed(2)) }));
});
