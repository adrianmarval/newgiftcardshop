'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const updateBrandInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  icon: z.string().default('📦'),
  image: z.string().nullable().optional(),
});

const updateBrandOutputSchema = z.object({
  success: z.literal(true),
  brand: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    icon: z.string(),
    image: z.string().nullable(),
    isActive: z.boolean(),
  }),
});

export const updateBrand = adminActionClient
  .inputSchema(updateBrandInputSchema)
  .outputSchema(updateBrandOutputSchema)
  .action(async ({ parsedInput }) => {
    const { id, ...data } = parsedInput;
    const brand = await prisma.brand.update({
      where: { id },
      data,
    });

    return { success: true as const, brand };
  });
