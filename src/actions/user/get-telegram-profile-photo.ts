'use server';

import prisma from '@/lib/prisma';
import { authActionClient, ActionError } from '@/lib/safe-action';
import { decryptBuffer } from '@/lib/encryption';
import { getTelegramProfilePhotoOutputSchema } from './schemas';

export const getTelegramProfilePhoto = authActionClient
  .outputSchema(getTelegramProfilePhotoOutputSchema)
  .action(async ({ ctx }) => {
    try {
      const telegramUser = await prisma.telegramUser.findUnique({
        where: { userId: ctx.auth.user.id },
        select: { photoData: true, photoMimeType: true },
      });

      if (!telegramUser?.photoData || !telegramUser.photoMimeType) {
        throw new ActionError('No profile photo available');
      }

      const decrypted = decryptBuffer(Buffer.from(telegramUser.photoData));
      const dataUrl = `data:${telegramUser.photoMimeType};base64,${decrypted.toString('base64')}`;

      return { success: true as const, dataUrl };
    } catch (error) {
      console.error('Get telegram profile photo error:', error);
      if (error instanceof ActionError) throw error;
      return { success: false as const, error: 'Failed to get profile photo' };
    }
  });