'use server';

import { z } from 'zod';
import { ActionError, sellerActionClient } from '@/lib/safe-action';
import { publishBatch as publishBatchService } from '@/lib/services/giftcard/publish.service';
import { logger } from '@/lib/logger';

const publishBatchInputSchema = z.object({
  cards: z.array(
    z.object({
      amount: z.string().trim().min(1),
      claimCode: z.string().trim().min(1),
      pinCode: z.string().trim().optional(),
      compressedImageData: z.string().optional(),
    }),
  ),
  brandId: z.string().min(1),
  countryId: z.string().min(1),
  unmatchedImages: z.array(z.object({ data: z.string() })).optional(),
});

const publishBatchOutputSchema = z.object({
  success: z.literal(true),
  batchId: z.number(),
  duplicates: z.array(z.string()),
});

export const publishBatch = sellerActionClient
  .inputSchema(publishBatchInputSchema)
  .outputSchema(publishBatchOutputSchema)
  .action(async ({ parsedInput: { brandId, cards, countryId, unmatchedImages }, ctx }) => {
    try {
      const result = await publishBatchService({
        userId: ctx.auth.user.id,
        brandId,
        countryId,
        cards,
        unmatchedImages,
      });

      logger.action('sell', 'publish-batch', `Batch #${result.batchId} publicado: ${result.totalPublished} tarjetas`, {
        userId: ctx.auth.user.id,
        metadata: { batchId: result.batchId, totalPublished: result.totalPublished, duplicates: result.duplicates.length, brandId, countryId },
      });

      return { success: true as const, batchId: result.batchId, duplicates: result.duplicates };
    } catch (error) {
      logger.error('Error al publicar batch', {
        userId: ctx.auth.user.id,
        metadata: { brandId, countryId, cardCount: cards.length },
        error: { name: error instanceof Error ? error.name : 'Error', message: error instanceof Error ? error.message : 'Unknown' },
      });
      throw new ActionError(error instanceof Error ? error.message : 'Error publishing batch');
    }
  });
