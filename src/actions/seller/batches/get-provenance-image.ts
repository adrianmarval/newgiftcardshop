'use server';

import prisma from '@/lib/prisma';
import { ActionError, sellerActionClient } from '@/lib/safe-action';
import { getProvenanceImageData } from '@/lib/services/giftcard';
import { getProvenanceImageInputSchema, getProvenanceImageOutputSchema } from './schemas';

/**
 * Resolves the provenance image of the seller's OWN card (dual source:
 * Telegram file_id / encrypted web bytes — same resolver as the admin batch
 * gallery). Used by ProvenanceImageDialog to show the current image before
 * replacing it.
 */
export const getProvenanceImage = sellerActionClient
  .inputSchema(getProvenanceImageInputSchema)
  .outputSchema(getProvenanceImageOutputSchema)
  .action(async ({ parsedInput: { giftcardId }, ctx }) => {
    const card = await prisma.giftcard.findUnique({
      where: { id: giftcardId },
      select: { ownerId: true },
    });
    if (!card) throw new ActionError('Card not found');
    if (card.ownerId !== ctx.auth.user.id) throw new ActionError('This card does not belong to you');

    return { success: true as const, image: await getProvenanceImageData(giftcardId) };
  });
