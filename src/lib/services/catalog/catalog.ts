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

/**
 * Catálogo completo de brand-countries con stock agregado (count + monto) para
 * los wizards web de compra/venta. Incluye inactivos (la UI los muestra
 * deshabilitados) — espejo de lo que antes hacía inline la action
 * getActiveBrandCountries.
 */
export async function getActiveBrandCountriesWithStock() {
  const brandCountries = await prisma.brandCountry.findMany({
    where: {},
    include: {
      brand: true,
      country: true,
      giftcards: {
        where: AVAILABLE_GIFTCARD_WHERE,
        select: { amount: true },
      },
    },
    orderBy: [{ country: { name: 'asc' } }, { brand: { name: 'asc' } }],
  });

  return brandCountries.map((bc) => ({
    id: bc.id,
    brandId: bc.brandId,
    countryId: bc.countryId,
    brandName: bc.brand.name,
    brandSlug: bc.brand.slug,
    brandIcon: bc.brand.icon,
    brandImage: bc.brand.image,
    countryName: bc.country.name,
    countryCode: bc.country.code,
    countryCurrency: bc.country.currency || 'USD',
    isActive: bc.isActive,
    minAmount: bc.minAmount ? Number(bc.minAmount) : null,
    maxAmount: bc.maxAmount ? Number(bc.maxAmount) : null,
    stockCount: bc.giftcards.length,
    stockAmount: bc.giftcards.reduce((sum, gc) => sum + gc.amount.toNumber(), 0),
  }));
}

/**
 * Marca por id (shape plano para la UI). Devuelve null si no existe.
 */
export async function getBrandSummaryById(id: string) {
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) return null;
  return {
    id: brand.id,
    slug: brand.slug,
    name: brand.name,
    icon: brand.icon,
    image: brand.image,
  };
}
