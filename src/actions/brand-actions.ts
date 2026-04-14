'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { getBrandByIdInputSchema, getActiveBrandsOutputSchema, getBrandByIdOutputSchema } from '@/types/catalog/schemas';

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

export const getBrandById = authActionClient
  .inputSchema(getBrandByIdInputSchema)
  .outputSchema(getBrandByIdOutputSchema)
  .action(async ({ parsedInput: { id } }) => {
    const brand = await prisma.brand.findUnique({
      where: { id },
    });
    if (!brand) {
      return { success: true as const, brand: null };
    }
    return {
      success: true as const,
      brand: {
        id: brand.id,
        slug: brand.slug,
        name: brand.name,
        icon: brand.icon,
        image: brand.image,
      },
    };
  });
