'use server';

import prisma from '@/lib/prisma';
import { adminActionClient, ActionError } from '@/lib/safe-action';
import { decryptBuffer } from '@/lib/encryption';
import { getBatchImagesInputSchema, getBatchImagesOutputSchema } from './schemas';

export const getBatchImages = adminActionClient
  .inputSchema(getBatchImagesInputSchema)
  .outputSchema(getBatchImagesOutputSchema)
  .action(async ({ parsedInput: { batchId } }) => {
    try {
      const images = await prisma.provenanceImage.findMany({
        where: { batchId },
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
            try {
              const fileRes = await fetch(
                `https://api.telegram.org/bot${botToken}/getFile?file_id=${img.telegramFileId}`,
              );
              const fileData = await fileRes.json();

              if (!fileData.ok) {
                console.error(
                  `[AdminBatchImages] Error fetching file info from Telegram for ID ${img.telegramFileId}`,
                );
                return null;
              }

              const filePath = fileData.result.file_path;
              const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

              const downloadRes = await fetch(downloadUrl);
              const arrayBuffer = await downloadRes.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              base64Data = buffer.toString('base64');
            } catch (err) {
              console.error(`[AdminBatchImages] Error downloading telegram file:`, err);
              return null;
            }
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
          };
        }),
      );

      return {
        success: true as const,
        images: processedImages.filter(Boolean) as Array<{ id: string; mimeType: string; base64: string }>,
      };
    } catch (error) {
      console.error('[AdminBatchImages] Server error:', error);
      throw new ActionError('Failed to fetch batch images');
    }
  });