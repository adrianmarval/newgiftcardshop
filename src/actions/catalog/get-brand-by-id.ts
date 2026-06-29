'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { getBrandByIdInputSchema, getBrandByIdOutputSchema } from './schemas';

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