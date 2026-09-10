import prisma from '@/lib/prisma';
import { AVAILABLE_GIFTCARD_WHERE } from '@/lib/constants';

/**
 * Stock en vivo GLOBAL por brand-country para el admin dashboard (el admin no
 * tiene tasa — no hay noción de "accesible por tier", solo el total en
 * plataforma). Incluye las brand-countries activas con stock 0 (dimmeadas en
 * la UI, mismo criterio que el grid del buyer).
 *
 * SIN unstable_cache: esta vista debe reflejar el stock <1s después de la
 * invalidación SSE (keys 'batches'/'orders' -> ['admin-live-stock']) — un
 * cache server de 60s la dejaría sirviendo data vieja tras cada refetch.
 * Son 2 queries baratas (findMany de catálogo + groupBy agregado).
 */
export async function getAdminLiveStock() {
  const brandCountries = await prisma.brandCountry.findMany({
    where: { isActive: true },
    include: { brand: true, country: true },
  });

  const grouped = await prisma.giftcard.groupBy({
    by: ['brandCountryId'],
    where: { ...AVAILABLE_GIFTCARD_WHERE, brandCountryId: { in: brandCountries.map((bc) => bc.id) } },
    _count: true,
    _sum: { amount: true },
  });

  const byBrandCountry = new Map(grouped.map((row) => [row.brandCountryId, row]));

  const items = brandCountries.map((bc) => {
    const stock = byBrandCountry.get(bc.id);
    return {
      brandCountryId: bc.id,
      brandName: bc.brand.name,
      brandIcon: bc.brand.icon,
      brandImage: bc.brand.image,
      countryName: bc.country.name,
      countryCode: bc.country.code,
      currency: bc.country.currency || 'USD',
      totalCount: stock?._count ?? 0,
      totalAmount: stock?._sum.amount?.toNumber() ?? 0,
    };
  });

  // Lo más pesado primero (mismo criterio de orden que el grid del buyer)
  items.sort((a, b) => b.totalAmount - a.totalAmount || b.totalCount - a.totalCount);

  return { items };
}
