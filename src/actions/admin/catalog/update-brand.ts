'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { updateBrandInputSchema, updateBrandOutputSchema } from './schemas';

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