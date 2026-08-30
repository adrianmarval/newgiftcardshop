'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import prisma from '@/lib/prisma';
import { getStockAgingReportOutputSchema } from './schemas';

// Buckets pensados para un mercado veloz: la granularidad fina está en horas,
// no en días. >3d es inventario críticamente varado.
const AGE_BUCKETS = [
  { range: '<1h', maxHours: 1 },
  { range: '1-6h', maxHours: 6 },
  { range: '6-24h', maxHours: 24 },
  { range: '1-3d', maxHours: 72 },
  { range: '>3d', maxHours: Infinity },
] as const;

export const getStockAgingReport = adminActionClient.outputSchema(getStockAgingReportOutputSchema).action(async () => {
  try {
    const giftcards = await prisma.giftcard.findMany({
      where: { inStock: true, status: 'UNUSED' },
      select: {
        amount: true,
        createdAt: true,
        brandCountryId: true,
        brandCountry: {
          select: {
            brand: { select: { name: true } },
            country: { select: { name: true, code: true } },
          },
        },
      },
    });

    const now = Date.now();

    interface Row {
      brandCountryId: string;
      brandName: string;
      countryName: string;
      countryCode: string;
      totalCards: number;
      totalAmount: number;
      oldestHours: number;
      buckets: { range: string; count: number; total: number }[];
    }

    const rowsByBrandCountry = new Map<string, Row>();

    for (const gc of giftcards) {
      if (!gc.brandCountryId || !gc.brandCountry) continue;

      let row = rowsByBrandCountry.get(gc.brandCountryId);
      if (!row) {
        row = {
          brandCountryId: gc.brandCountryId,
          brandName: gc.brandCountry.brand.name,
          countryName: gc.brandCountry.country.name,
          countryCode: gc.brandCountry.country.code,
          totalCards: 0,
          totalAmount: 0,
          oldestHours: 0,
          buckets: AGE_BUCKETS.map((b) => ({ range: b.range, count: 0, total: 0 })),
        };
        rowsByBrandCountry.set(gc.brandCountryId, row);
      }

      const amount = gc.amount.toNumber();
      const ageHours = (now - gc.createdAt.getTime()) / 3_600_000;

      row.totalCards += 1;
      row.totalAmount += amount;
      row.oldestHours = Math.max(row.oldestHours, ageHours);

      const bucketIndex = AGE_BUCKETS.findIndex((b) => ageHours < b.maxHours);
      const bucket = row.buckets[bucketIndex === -1 ? AGE_BUCKETS.length - 1 : bucketIndex];
      bucket.count += 1;
      bucket.total += amount;
    }

    return Array.from(rowsByBrandCountry.values())
      .map((row) => ({
        ...row,
        totalAmount: Number(row.totalAmount.toFixed(2)),
        oldestHours: Number(row.oldestHours.toFixed(1)),
        buckets: row.buckets.map((b) => ({ ...b, total: Number(b.total.toFixed(2)) })),
      }))
      .sort((a, b) => b.oldestHours - a.oldestHours);
  } catch (error) {
    console.error('[getStockAgingReport]', error);
    throw new ActionError('Error al obtener el reporte de antigüedad de stock.');
  }
});
