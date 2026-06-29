import prisma from '@/lib/prisma';
import type { SubscribedBrandCountry } from '@/types';

export async function getSubscribedBrandCountries(userId: string): Promise<SubscribedBrandCountry[]> {
  const rates = await prisma.userBrandCountryRate.findMany({
    where: { userId },
    include: {
      brandCountry: {
        include: {
          brand: { select: { name: true, icon: true, image: true } },
          country: { select: { name: true, code: true, currency: true } },
        },
      },
    },
    orderBy: [{ brandCountry: { brand: { name: 'asc' } } }, { brandCountry: { country: { name: 'asc' } } }],
  });

  const preference = await prisma.notificationPreference.findUnique({
    where: { userId },
    include: { subscriptions: { select: { brandCountryId: true } } },
  });

  const subscribedIds = new Set((preference?.subscriptions ?? []).map((s) => s.brandCountryId));

  return rates.map((rate) => ({
    id: rate.brandCountry.id,
    brandName: rate.brandCountry.brand.name,
    brandIcon: rate.brandCountry.brand.icon,
    brandImage: rate.brandCountry.brand.image,
    countryName: rate.brandCountry.country.name,
    countryCode: rate.brandCountry.country.code,
    countryCurrency: rate.brandCountry.country.currency || 'USD',
    subscribed: subscribedIds.size === 0 ? true : subscribedIds.has(rate.brandCountry.id),
  }));
}