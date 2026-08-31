'use server';

import { buyerActionClient, ActionError } from '@/lib/safe-action';
import prisma from '@/lib/prisma';
import { AVAILABLE_GIFTCARD_WHERE } from '@/lib/constants';
import { liveAvailabilityOutputSchema } from './schemas';

/**
 * Live availability per brand-country, scoped to the brands where the buyer
 * has an assigned rate. Per brand it returns BOTH the total in-stock numbers
 * and the ACCESSIBLE ones (escalationTier <= buyer buyRate — what they can
 * actually buy right now). Powers the live availability grid on the buyer
 * dashboard (re-rendered every 15s by AutoRefreshProvider).
 */
export const getLiveAvailability = buyerActionClient
  .outputSchema(liveAvailabilityOutputSchema)
  .action(async ({ ctx }) => {
    try {
      const userId = ctx.auth.user.id;

      const rates = await prisma.userBrandCountryRate.findMany({
        where: { userId },
        include: {
          brandCountry: { include: { brand: true, country: true } },
        },
      });

      const items = await Promise.all(
        rates.map(async (rate) => {
          const bc = rate.brandCountry;
          const buyerTier = Math.floor(rate.buyRate.toNumber() * 100);
          const [total, accessible] = await Promise.all([
            prisma.giftcard.aggregate({
              where: { brandCountryId: bc.id, ...AVAILABLE_GIFTCARD_WHERE },
              _count: true,
              _sum: { amount: true },
            }),
            prisma.giftcard.aggregate({
              where: {
                brandCountryId: bc.id,
                ...AVAILABLE_GIFTCARD_WHERE,
                escalationTier: { lte: buyerTier },
              },
              _count: true,
              _sum: { amount: true },
            }),
          ]);

          return {
            brandCountryId: bc.id,
            brandId: bc.brandId,
            countryId: bc.countryId,
            brandName: bc.brand.name,
            brandIcon: bc.brand.icon,
            brandImage: bc.brand.image,
            countryName: bc.country.name,
            countryCode: bc.country.code,
            currency: bc.country.currency || 'USD',
            totalCount: total._count,
            totalAmount: total._sum.amount?.toNumber() ?? 0,
            accessibleCount: accessible._count,
            accessibleAmount: accessible._sum.amount?.toNumber() ?? 0,
            buyRate: rate.buyRate.toNumber(),
          };
        }),
      );

      return { items };
    } catch (error) {
      console.error('[getLiveAvailability]', error);
      throw new ActionError('Error al obtener la disponibilidad.');
    }
  });
