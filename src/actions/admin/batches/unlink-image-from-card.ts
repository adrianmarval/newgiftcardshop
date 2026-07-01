'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { unlinkImageFromCardInputSchema, unlinkImageFromCardOutputSchema } from './schemas';

export const unlinkImageFromCard = adminActionClient
  .inputSchema(unlinkImageFromCardInputSchema)
  .outputSchema(unlinkImageFromCardOutputSchema)
  .action(async ({ parsedInput: { imageId } }) => {
    const image = await prisma.provenanceImage.findUnique({
      where: { id: imageId },
      select: { id: true, giftcardId: true },
    });

    if (!image) {
      return { success: false as const, error: 'Image not found' };
    }

    if (!image.giftcardId) {
      return { success: true as const };
    }

    await prisma.$transaction(async (tx) => {
      await tx.provenanceImage.update({
        where: { id: imageId },
        data: { giftcardId: null },
      });

      await tx.giftcard.update({
        where: { id: image.giftcardId! },
        data: { provenanceImageId: null },
      });
    });

    return { success: true as const };
  });
