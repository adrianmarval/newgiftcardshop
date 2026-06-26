import prisma from '@/lib/prisma';
import { AVAILABLE_GIFTCARD_WHERE } from '@/lib/constants';

/**
 * Gets all active brands that have at least one country with in-stock giftcards.
 * Used by both bot and web for brand selection.
 */
export async function getBrandsWithStock() {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    include: {
      countries: {
        where: { isActive: true },
        include: {
          giftcards: { where: AVAILABLE_GIFTCARD_WHERE, select: { id: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return brands.filter((b) => b.countries.some((c) => c.giftcards.length > 0));
}

/**
 * Gets a brand with its active countries and stock info.
 * Returns null if brand not found.
 */
export async function getBrandWithCountries(brandId: string) {
  return prisma.brand.findUnique({
    where: { id: brandId },
    include: {
      countries: {
        where: { isActive: true },
        include: {
          country: true,
          giftcards: { where: AVAILABLE_GIFTCARD_WHERE, select: { amount: true } },
        },
      },
    },
  });
}

/**
 * Gets a country by ID.
 */
export async function getCountryById(countryId: string) {
  return prisma.country.findUnique({ where: { id: countryId } });
}
