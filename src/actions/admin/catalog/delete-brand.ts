'use server';

import prisma from '@/lib/prisma';
import { ActionError, adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const deleteBrandInputSchema = z.object({ id: z.string() });
const deleteBrandOutputSchema = z.object({ success: z.literal(true) });

export const deleteBrand = adminActionClient.inputSchema(deleteBrandInputSchema).outputSchema(deleteBrandOutputSchema).action(async ({ parsedInput }) => {
  const { id } = parsedInput;

  // Check if brand has giftcards
  const giftcardCount = await prisma.giftcard.count({
    where: { brandCountry: { brandId: id } },
  });

  if (giftcardCount > 0) {
    throw new ActionError('Cannot delete brand with existing giftcards');
  }

  // Delete brand countries first
  await prisma.brandCountry.deleteMany({ where: { brandId: id } });

  // Delete brand
  await prisma.brand.delete({ where: { id } });

  return { success: true as const };
});
