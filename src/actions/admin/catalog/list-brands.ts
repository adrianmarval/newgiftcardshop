'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { listBrandsOutputSchema } from './schemas';

export const listBrands = adminActionClient.outputSchema(listBrandsOutputSchema).action(async () => {
  const brands = await prisma.brand.findMany({
    orderBy: { name: 'asc' },
    include: {
      countries: {
        include: {
          country: true,
        },
      },
    },
  });

  return {
    success: true as const,
    brands: brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      icon: brand.icon,
      image: brand.image,
      isActive: brand.isActive,
      countries: brand.countries.map((bc) => ({
        id: bc.id,
        countryId: bc.countryId,
        countryName: bc.country.name,
        countryCode: bc.country.code,
        minAmount: bc.minAmount ? Number(bc.minAmount) : null,
        maxAmount: bc.maxAmount ? Number(bc.maxAmount) : null,
        isActive: bc.isActive,
        claimCodePattern: bc.claimCodePattern ?? null,
        stockDigestIntervalMinutes: bc.stockDigestIntervalMinutes ?? null,
        stockReminderIntervalMinutes: bc.stockReminderIntervalMinutes ?? null,
      })),
    })),
  };
});