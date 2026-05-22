'use server';

import { z } from 'zod';
import { authActionClient, ActionError } from '@/lib/safe-action';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { decryptBuffer } from '@/lib/encryption';
import { auth } from '@/lib/auth';

const getTelegramProfilePhotoOutputSchema = z.union([
  z.object({ success: z.literal(true), dataUrl: z.string() }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export const getTelegramProfilePhoto = authActionClient.outputSchema(getTelegramProfilePhotoOutputSchema).action(async () => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;
    if (!userId) throw new ActionError('Unauthorized');

    const telegramUser = await prisma.telegramUser.findUnique({
      where: { userId },
      select: { photoData: true, photoMimeType: true },
    });

    if (!telegramUser?.photoData) {
      return { success: false as const, error: 'No photo found' };
    }

    const decrypted = decryptBuffer(Buffer.from(telegramUser.photoData));
    const base64 = decrypted.toString('base64');
    const mimeType = telegramUser.photoMimeType || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return { success: true as const, dataUrl };
  } catch (err) {
    console.error('[getTelegramProfilePhoto]', err);
    return { success: false as const, error: 'Failed to decrypt photo' };
  }
});
