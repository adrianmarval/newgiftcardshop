// ─────────────────────────────────────────────────────────────────────────────
// Telegram Photo — descarga la foto de perfil del usuario y la cifra
// (AES-256-GCM) para persistirla en TelegramUser.photoData.
// ─────────────────────────────────────────────────────────────────────────────

import { encryptBuffer } from '@/lib/encryption';
import type { BotContext } from './types.js';

export async function fetchAndEncryptTelegramPhoto(
  ctx: BotContext,
  telegramId: string,
  botToken: string,
): Promise<{ data: Buffer; mimeType: string } | null> {
  try {
    const photos = await ctx.api.getUserProfilePhotos(Number(telegramId), { limit: 1 });
    if (photos.total_count === 0) return null;

    const photo = photos.photos[0];
    if (!photo || photo.length === 0) return null;

    const largestPhoto = photo[photo.length - 1];
    const file = await ctx.api.getFile(largestPhoto.file_id);
    if (!file.file_path) return null;

    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
    const response = await fetch(downloadUrl);
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    const { data: encryptedData } = encryptBuffer(buffer);

    return { data: encryptedData, mimeType: 'image/jpeg' };
  } catch (error) {
    console.error('Error fetching Telegram profile photo:', error);
    return null;
  }
}
