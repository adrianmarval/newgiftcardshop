'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { getActiveBrandsOutputSchema } from '@/types/domain/catalog';

export const getActiveBrands = authActionClient.outputSchema(getActiveBrandsOutputSchema).action(async () => {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  return {
    success: true as const,
    brands: brands.map((brand) => ({
      id: brand.id,
      slug: brand.slug,
      name: brand.name,
      icon: brand.icon,
      image: brand.image,
    })),
  };
});
