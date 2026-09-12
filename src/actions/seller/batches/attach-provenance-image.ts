'use server';

import { ActionError, sellerActionClient } from '@/lib/safe-action';
import { compressImage } from '@/lib/image-utils';
import { encryptBuffer } from '@/lib/encryption';
import { attachProvenanceImage as attachProvenanceImageService } from '@/lib/services/giftcard';
import { attachProvenanceImageInputSchema, attachProvenanceImageOutputSchema } from './schemas';

/**
 * Attach (or replace) the provenance image of a card — late attach from the
 * seller's batch history. Works in any batch status: the evidence may be
 * needed post-payout for a dispute. Replaces the previous image if any.
 */
export const attachProvenanceImage = sellerActionClient
  .inputSchema(attachProvenanceImageInputSchema)
  .outputSchema(attachProvenanceImageOutputSchema)
  .action(async ({ parsedInput: { giftcardId, file }, ctx }) => {
    let data: Uint8Array<ArrayBuffer>;
    let mimeType: string;
    let size: number;
    try {
      const compressed = await compressImage(file);
      data = new Uint8Array(encryptBuffer(compressed.buffer).data);
      mimeType = compressed.mimeType;
      size = compressed.buffer.length;
    } catch (error) {
      throw new ActionError(error instanceof Error ? error.message : 'Failed to process the provenance image');
    }

    try {
      await attachProvenanceImageService({ giftcardId, userId: ctx.auth.user.id, data, mimeType, size });
      return { success: true as const };
    } catch (err) {
      throw new ActionError((err as Error).message || 'Failed to attach the provenance image');
    }
  });
