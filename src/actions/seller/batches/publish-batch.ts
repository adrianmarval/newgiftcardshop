'use server';

import { ActionError, sellerActionClient } from '@/lib/safe-action';
import { publishBatch as publishBatchService } from '@/lib/services/giftcard/publish.service';
import { logger } from '@/lib/logger';
import { publishBatchInputSchema, publishBatchOutputSchema } from './schemas';

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

      logger.action(
        'sell',
        'publish-batch',
        `Batch #${result.batchId} publicado: ${result.totalPublished} tarjetas`,
        {
          userId: ctx.auth.user.id,
          metadata: {
            batchId: result.batchId,
            totalPublished: result.totalPublished,
            duplicates: result.duplicates.length,
            brandId,
            countryId,
          },
        },
      );

      return { success: true as const, batchId: result.batchId, duplicates: result.duplicates };
    } catch (error) {
      logger.error('Error al publicar batch', {
        userId: ctx.auth.user.id,
        metadata: { brandId, countryId, cardCount: cards.length },
        error: {
          name: error instanceof Error ? error.name : 'Error',
          message: error instanceof Error ? error.message : 'Unknown',
        },
      });
      throw new ActionError(error instanceof Error ? error.message : 'Error publishing batch');
    }
  });