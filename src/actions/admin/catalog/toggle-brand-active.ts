'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { toggleBrandActiveInputSchema, toggleBrandActiveOutputSchema } from './schemas';

export const toggleBrandActive = adminActionClient
  .inputSchema(toggleBrandActiveInputSchema)
  .outputSchema(toggleBrandActiveOutputSchema)
  .action(async ({ parsedInput }) => {
    const { id, isActive } = parsedInput;

    await prisma.brand.update({
      where: { id },
      data: { isActive },
    });

    return { success: true as const };
  });