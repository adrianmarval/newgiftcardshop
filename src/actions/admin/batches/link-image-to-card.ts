'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { linkImageToCardInputSchema, linkImageToCardOutputSchema } from './schemas';

export const linkImageToCard = adminActionClient
  .inputSchema(linkImageToCardInputSchema)
  .outputSchema(linkImageToCardOutputSchema)
  .action(async ({ parsedInput: { imageId, giftcardId } }) => {
    const image = await prisma.provenanceImage.findUnique({
      where: { id: imageId },
      select: { id: true, batchId: true, giftcardId: true },
    });

    if (!image) {
      return { success: false as const, error: 'Image not found' };
    }

    if (image.giftcardId === giftcardId) {
      return { success: true as const };
    }

    const card = await prisma.giftcard.findUnique({
      where: { id: giftcardId },
      select: { id: true, batchId: true, provenanceImageId: true },
    });

    if (!card) {
      return { success: false as const, error: 'Card not found' };
    }

    if (image.batchId && card.batchId && image.batchId !== card.batchId.toString()) {
      return { success: false as const, error: 'Image and card belong to different batches' };
    }

    await prisma.$transaction(async (tx) => {
      if (card.provenanceImageId && card.provenanceImageId !== imageId) {
        await tx.provenanceImage.update({
          where: { id: card.provenanceImageId },
          data: { giftcardId: null },
        });
      }

      if (image.giftcardId) {
        await tx.giftcard.update({
          where: { id: image.giftcardId },
          data: { provenanceImageId: null },
        });
      }

      await tx.provenanceImage.update({
        where: { id: imageId },
        data: { giftcardId },
      });

      await tx.giftcard.update({
        where: { id: giftcardId },
        data: { provenanceImageId: imageId },
      });
    });

    return { success: true as const };
  });
