'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const deleteBrandInputSchema = z.object({ id: z.string() });

export const deleteBrand = adminActionClient.inputSchema(deleteBrandInputSchema).action(async ({ parsedInput }) => {
  const { id } = parsedInput;

  // Check if brand has giftcards
  const giftcardCount = await prisma.giftcard.count({
    where: { brandCountry: { brandId: id } },
  });

  if (giftcardCount > 0) {
    throw new Error('Cannot delete brand with existing giftcards');
  }

  // Delete brand countries first
  await prisma.brandCountry.deleteMany({ where: { brandId: id } });

  // Delete brand
  await prisma.brand.delete({ where: { id } });

  return { success: true as const };
});
