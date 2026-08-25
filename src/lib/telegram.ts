import prisma from '@/lib/prisma';
import { decryptBuffer } from '@/lib/encryption';

/**
 * Fetches and decrypts a user's Telegram profile photo from the DB.
 * Returns a data URL string or null if no photo is available.
 */
export async function getDecryptedTelegramPhotoUrl(userId: string): Promise<string | null> {
  const tu = await prisma.telegramUser.findUnique({
    where: { userId },
    select: { photoData: true, photoMimeType: true },
  });

  if (!tu?.photoData) return null;

  const decrypted = decryptBuffer(Buffer.from(tu.photoData));
  const mimeType = tu.photoMimeType || 'image/jpeg';
  return `data:${mimeType};base64,${decrypted.toString('base64')}`;
}
