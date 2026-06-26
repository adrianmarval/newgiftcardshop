'use server';

import { z } from 'zod';
import { ActionError, sellerActionClient } from '@/lib/safe-action';
import { extractGiftCardData } from '@/lib/services/giftcard/vision.service';

const chunk = <T>(arr: T[], size: number): T[][] => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
};

const extractFromImages = async (images: Array<{ id: string; compressedData: string }>) => {
  const chunks = chunk(images, 10);
  const results = [];

  for (const batch of chunks) {
    const batchResults = await Promise.all(
      batch.map(async (image) => {
        try {
          const extraction = await extractGiftCardData(image.compressedData, 'image/jpeg');
          return { imageId: image.id, claimCode: extraction.claimCode, amount: extraction.amount, error: false };
        } catch {
          return { imageId: image.id, claimCode: null, amount: null, error: true };
        }
      }),
    );
    results.push(...batchResults);
  }
  return results;
};

const extractDraftInputSchema = z.object({
  images: z.array(z.object({ id: z.string(), compressedData: z.string() })),
});

export const extractDraft = sellerActionClient
  .inputSchema(extractDraftInputSchema)
  .action(async ({ parsedInput: { images } }) => {
    try {
      const extractions = await extractFromImages(images);
      const cards: Array<{
        claimCode?: string;
        amount?: string;
        imageId?: string;
        ocrConfidence: 'high' | 'manual';
        rawExtractedCode?: string;
        rawExtractedAmount?: string;
      }> = [];
      const ignoredImages: Array<{ imageId: string; reason: 'unreadable' | 'unmatched' }> = [];

      for (const ext of extractions) {
        if (ext.error || !ext.claimCode) {
          ignoredImages.push({ imageId: ext.imageId, reason: ext.error ? 'unreadable' : 'unmatched' });
          continue;
        }

        const raw = ext.claimCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const isValidLength = raw.length === 14 || raw.length === 15;

        let ocrConfidence: 'high' | 'manual' = 'manual';
        let normalizedCode: string | undefined;

        if (isValidLength) {
          ocrConfidence = 'high';
          normalizedCode =
            raw.length === 14
              ? `${raw.slice(0, 4)}-${raw.slice(4, 10)}-${raw.slice(10, 14)}`
              : `${raw.slice(0, 4)}-${raw.slice(4, 10)}-${raw.slice(10, 15)}`;
        } else {
          normalizedCode = ext.claimCode;
        }

        cards.push({
          claimCode: normalizedCode,
          amount: ext.amount ?? undefined,
          imageId: ext.imageId,
          ocrConfidence,
          rawExtractedCode: ext.claimCode,
          rawExtractedAmount: ext.amount ?? undefined,
        });
      }

      return { cards, ignoredImages };
    } catch (error) {
      throw new ActionError(error instanceof Error ? error.message : 'Failed to extract draft batch');
    }
  });
