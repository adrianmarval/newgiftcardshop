'use server';

import prisma from '@/lib/prisma';
import { adminActionClient, ActionError } from '@/lib/safe-action';
import { decryptBuffer } from '@/lib/encryption';
import { z } from 'zod';

const inputSchema = z.object({ userId: z.string() });

export const getAdminTelegramPhoto = adminActionClient
  .inputSchema(inputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const telegramUser = await prisma.telegramUser.findUnique({
        where: { userId: parsedInput.userId },
        select: { photoData: true, photoMimeType: true },
      });

      if (!telegramUser?.photoData || !telegramUser.photoMimeType) {
        throw new ActionError('No profile photo available');
      }

      const decrypted = decryptBuffer(Buffer.from(telegramUser.photoData));
      const dataUrl = `data:${telegramUser.photoMimeType};base64,${decrypted.toString('base64')}`;

      return { success: true as const, dataUrl };
    } catch (error) {
      if (error instanceof ActionError) throw error;
      console.error('[getAdminTelegramPhoto]', error);
      return { success: false as const, error: 'Failed to get profile photo' };
    }
  });
