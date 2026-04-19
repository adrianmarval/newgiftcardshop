'use server';

import { sellerActionClient } from '@/lib/safe-action';
import { compressImage } from '@/lib/image-utils';
import { extractGiftCardData, levenshtein } from '@/lib/giftcard-vision';
import { z } from 'zod';
import { uploadProvenanceImageInputSchema, extractDraftBatchInputSchema, extractDraftBatchOutputSchema } from '@/types/sell/validation';

interface ExtractionWithId {
  imageId: string;
  claimCode: string | null;
  amount: string | null;
  error: boolean;
}

const chunk = <T>(arr: T[], size: number): T[][] => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
};

export const uploadProvenanceImage = sellerActionClient
  .inputSchema(uploadProvenanceImageInputSchema)
  .outputSchema(
    z.union([z.object({ success: z.literal(true), compressedData: z.string(), mimeType: z.string() }), z.object({ error: z.string() })]),
  )
  .action(async ({ parsedInput: { file } }) => {
    try {
      const { buffer, mimeType } = await compressImage(file);
      return { success: true as const, compressedData: buffer.toString('base64'), mimeType };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to upload provenance image' };
    }
  });

const extractFromImages = async (images: Array<{ id: string; compressedData: string }>): Promise<ExtractionWithId[]> => {
  const chunks = chunk(images, 10);
  const results: ExtractionWithId[] = [];

  for (const batch of chunks) {
    const batchResults = await Promise.all(
      batch.map(async (image) => {
        try {
          const extraction = await extractGiftCardData(image.compressedData, 'image/jpeg');
          return { imageId: image.id, claimCode: extraction.claimCode, amount: extraction.amount, error: false };
        } catch (error) {
          return { imageId: image.id, claimCode: null, amount: null, error: true };
        }
      }),
    );
    results.push(...batchResults);
  }
  return results;
};

export const extractDraftBatch = sellerActionClient
  .inputSchema(extractDraftBatchInputSchema)
  .outputSchema(extractDraftBatchOutputSchema)
  .action(async ({ parsedInput: { images } }) => {
    try {
      const extractions = await extractFromImages(images);
      const cards: Array<{
        claimCode?: string;
        amount?: string;
        imageId?: string;
        ocrConfidence: 'high' | 'fuzzy' | 'manual';
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

        let ocrConfidence: 'high' | 'fuzzy' | 'manual';
        let normalizedCode: string | undefined;

        if (isValidLength) {
          ocrConfidence = 'high';
          normalizedCode =
            raw.length === 14
              ? `${raw.slice(0, 4)}-${raw.slice(4, 10)}-${raw.slice(10, 14)}`
              : `${raw.slice(0, 4)}-${raw.slice(4, 10)}-${raw.slice(10, 15)}`;
        } else if (raw.length >= 12 && raw.length <= 17) {
          const target14 = raw.slice(0, 14).padEnd(14, '0');
          const dist = levenshtein(raw, target14);
          ocrConfidence = dist <= 3 ? 'fuzzy' : 'manual';
          normalizedCode = ext.claimCode;
        } else {
          ocrConfidence = 'manual';
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

      return { success: true as const, cards, ignoredImages };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to extract draft batch' };
    }
  });
