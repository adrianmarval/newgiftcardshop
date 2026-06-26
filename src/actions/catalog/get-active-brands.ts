'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const getActiveBrandsOutputSchema = z.object({
  success: z.literal(true),
  brands: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
      icon: z.string(),
      image: z.string().nullable(),
    }),
  ),
});

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
