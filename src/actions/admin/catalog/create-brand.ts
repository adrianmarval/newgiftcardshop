'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { createBrandInputSchema, createBrandOutputSchema } from './schemas';

export const createBrand = adminActionClient
  .inputSchema(createBrandInputSchema)
  .outputSchema(createBrandOutputSchema)
  .action(async ({ parsedInput }) => {
    const brand = await prisma.brand.create({
      data: parsedInput,
    });

    return { success: true as const, brand };
  });