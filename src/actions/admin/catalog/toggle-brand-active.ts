'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const toggleBrandActiveInputSchema = z.object({ id: z.string(), isActive: z.boolean() });
const toggleBrandActiveOutputSchema = z.object({ success: z.literal(true) });

export const toggleBrandActive = adminActionClient.inputSchema(toggleBrandActiveInputSchema).outputSchema(toggleBrandActiveOutputSchema).action(async ({ parsedInput }) => {
  const { id, isActive } = parsedInput;

  await prisma.brand.update({
    where: { id },
    data: { isActive },
  });

  return { success: true as const };
});
