'use server';

import prisma from '@/lib/prisma';
import { ActionError, adminActionClient } from '@/lib/safe-action';
import { deleteBrandInputSchema, deleteBrandOutputSchema } from './schemas';

export const deleteBrand = adminActionClient
  .inputSchema(deleteBrandInputSchema)
  .outputSchema(deleteBrandOutputSchema)
  .action(async ({ parsedInput }) => {
    const { id } = parsedInput;

    const giftcardCount = await prisma.giftcard.count({
      where: { brandCountry: { brandId: id } },
    });

    if (giftcardCount > 0) {
      throw new ActionError('Cannot delete brand with existing giftcards');
    }

    await prisma.brandCountry.deleteMany({ where: { brandId: id } });
    await prisma.brand.delete({ where: { id } });

    return { success: true as const };
  });