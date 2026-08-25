'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import { getDecryptedTelegramPhotoUrl } from '@/lib/telegram';
import { z } from 'zod';

const inputSchema = z.object({ userId: z.string() });

export const getAdminTelegramPhoto = adminActionClient
  .inputSchema(inputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const dataUrl = await getDecryptedTelegramPhotoUrl(parsedInput.userId);
      if (!dataUrl) throw new ActionError('No profile photo available');
      return { success: true as const, dataUrl };
    } catch (error) {
      if (error instanceof ActionError) throw error;
      console.error('[getAdminTelegramPhoto]', error);
      return { success: false as const, error: 'Failed to get profile photo' };
    }
  });
