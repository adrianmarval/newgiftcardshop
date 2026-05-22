'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const createBrandInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  icon: z.string().default('📦'),
  image: z.string().nullable().optional(),
});

const createBrandOutputSchema = z.object({
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

export const createBrand = adminActionClient
  .inputSchema(createBrandInputSchema)
  .outputSchema(createBrandOutputSchema)
  .action(async ({ parsedInput }) => {
    const brand = await prisma.brand.create({
      data: parsedInput,
    });

    return { success: true, brand };
  });
