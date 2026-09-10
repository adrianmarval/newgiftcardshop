'use server';

import prisma from '@/lib/prisma';
import { adminActionClient, ActionError } from '@/lib/safe-action';
import { decryptBuffer } from '@/lib/encryption';
import { downloadTelegramFileAsBase64 } from '@/lib/services/telegram/telegram-file';
import { getBatchImagesInputSchema, getBatchImagesOutputSchema } from './schemas';

export const getBatchImages = adminActionClient
  .inputSchema(getBatchImagesInputSchema)
  .outputSchema(getBatchImagesOutputSchema)
  .action(async ({ parsedInput: { batchId } }) => {
    try {
      const images = await prisma.provenanceImage.findMany({
        where: { batchId },
        select: { id: true, mimeType: true, data: true, telegramFileId: true, giftcardId: true },
      });

      if (!images || images.length === 0) {
        return { success: true as const, images: [] };
      }

      const botToken = process.env.SELLER_BOT_TOKEN;
      if (!botToken) {
        throw new ActionError('SELLER_BOT_TOKEN is missing on server');
      }

      const processedImages = await Promise.all(
        images.map(async (img) => {
          let base64Data = '';
          const mimeType = img.mimeType || 'image/jpeg';

          if (img.telegramFileId) {
            const downloaded = await downloadTelegramFileAsBase64(botToken, img.telegramFileId);
            if (!downloaded) return null;
            base64Data = downloaded.base64;
          } else if (img.data) {
            try {
              const decrypted = decryptBuffer(Buffer.from(img.data));
              base64Data = decrypted.toString('base64');
            } catch (err) {
              console.error(`[AdminBatchImages] Error decrypting DB image ${img.id}:`, err);
              return null;
            }
          } else {
            return null;
          }

          return {
            id: img.id,
            mimeType,
            base64: base64Data,
            giftcardId: img.giftcardId ?? null,
          };
        }),
      );

      return {
        success: true as const,
        images: processedImages.filter(Boolean) as Array<{ id: string; mimeType: string; base64: string; giftcardId: string | null }>,
      };
    } catch (error) {
      console.error('[AdminBatchImages] Server error:', error);
      throw new ActionError('Failed to fetch batch images');
    }
  });