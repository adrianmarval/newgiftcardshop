'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const getBrandByIdInputSchema = z.object({
  id: z.string(),
});

const getBrandByIdOutputSchema = z.object({
  success: z.literal(true),
  brand: z
    .object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
      icon: z.string().nullable(),
      image: z.string().nullable(),
    })
    .nullable(),
});

export const getBrandById = authActionClient
  .inputSchema(getBrandByIdInputSchema)
  .outputSchema(getBrandByIdOutputSchema)
  .action(async ({ parsedInput: { id } }) => {
    const brand = await prisma.brand.findUnique({
      where: { id },
    });
    if (!brand) {
      return { success: true, brand: null };
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
