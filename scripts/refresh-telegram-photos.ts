/**
 * Script: Actualizar fotos de perfil de Telegram
 *
 * Itera todos los TelegramUser, descarga la foto más grande desde la API
 * de Telegram (usando el bot correcto según el rol), la cifra con
 * AES-256-GCM y la guarda en la DB.
 *
 * Uso:
 *   pnpm refresh-photos
 *
 * Requiere: DATABASE_URL, BUYER_BOT_TOKEN, SELLER_BOT_TOKEN, ENCRYPTION_KEY
 */

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { encryptBuffer } from '../src/lib/encryption';
import { Bot } from 'grammy';
import 'dotenv/config';

const BUYER_BOT_TOKEN = '7800477580:AAGdmCDobxveqByMGZ3Kg7eJh5qZmNtCHfg';
const SELLER_BOT_TOKEN = '8314698515:AAFPOCFwIqGbh-M9Bu6PduD2vyVOhRtLQMY';
const DATABASE_URL = process.env.DATABASE_URL;

if (!BUYER_BOT_TOKEN) {
  console.error('❌ BUYER_BOT_TOKEN es requerido');
  process.exit(1);
}

if (!SELLER_BOT_TOKEN) {
  console.error('❌ SELLER_BOT_TOKEN es requerido');
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL es requerido');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const buyerBot = new Bot(BUYER_BOT_TOKEN);
const sellerBot = new Bot(SELLER_BOT_TOKEN);

const DELAY_MS = 200;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getBotForRole(role: string): { bot: Bot; token: string } {
  if (role === 'SELLER') return { bot: sellerBot, token: SELLER_BOT_TOKEN };
  return { bot: buyerBot, token: BUYER_BOT_TOKEN };
}

async function fetchAndEncryptPhoto(telegramId: string, bot: Bot, token: string): Promise<{ data: Buffer; mimeType: string } | null> {
  try {
    const photos = await bot.api.getUserProfilePhotos(Number(telegramId), { limit: 1 });
    if (photos.total_count === 0) return null;

    const photo = photos.photos[0];
    if (!photo || photo.length === 0) return null;

    const largestPhoto = photo[photo.length - 1];
    const file = await bot.api.getFile(largestPhoto.file_id);
    if (!file.file_path) return null;

    const downloadUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const response = await fetch(downloadUrl);
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    const { data: encryptedData } = encryptBuffer(buffer);

    return { data: encryptedData, mimeType: 'image/jpeg' };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('user not found')) return null;
    console.error(`  ⚠ Error: ${msg}`);
    return null;
  }
}

async function main() {
  console.log('🔍 Buscando usuarios con Telegram vinculado...\n');

  const telegramUsers = await prisma.telegramUser.findMany({
    select: {
      id: true,
      telegramId: true,
      username: true,
      firstName: true,
      user: { select: { role: true } },
    },
  });

  const buyers = telegramUsers.filter((t) => t.user.role === 'BUYER').length;
  const sellers = telegramUsers.filter((t) => t.user.role === 'SELLER').length;
  const admins = telegramUsers.filter((t) => t.user.role === 'ADMIN').length;

  console.log(`📋 ${telegramUsers.length} usuarios encontrados (${buyers} buyers, ${sellers} sellers, ${admins} admins)\n`);

  let updated = 0;
  let noPhoto = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < telegramUsers.length; i++) {
    const tu = telegramUsers[i];
    const label = tu.username || tu.firstName || tu.telegramId;
    const role = tu.user.role.toLowerCase();
    const progress = `[${i + 1}/${telegramUsers.length}]`;

    process.stdout.write(`${progress} ${label} (${role})... `);

    const { bot, token } = getBotForRole(tu.user.role);
    const result = await fetchAndEncryptPhoto(tu.telegramId, bot, token);

    if (!result) {
      // Check if it was "user not found" vs "no photo"
      // We treat both as not-available since we can't distinguish after the catch
      // But "no photo" means the user exists but has no profile picture
      // We attempt a second check: if getUserProfilePhotos succeeds with count=0 → no photo
      // If it throws → not found (already handled in fetchAndEncryptPhoto)
      // Since fetchAndEncryptPhoto returns null for both, we just count as not-found or no-photo
      // The "user not found" case is already caught inside, so null here = either no photo or not found
      // To distinguish, we'd need a separate call — not worth the extra API hit.
      // We'll count it as "no disponible" which covers both cases.
      console.log('no disponible');
      noPhoto++;
      await sleep(DELAY_MS);
      continue;
    }

    try {
      await prisma.telegramUser.update({
        where: { id: tu.id },
        data: {
          photoData: new Uint8Array(result.data),
          photoMimeType: result.mimeType,
        },
      });
      console.log('✅ actualizada');
      updated++;
    } catch (error) {
      console.log('❌ error DB');
      errors++;
    }

    await sleep(DELAY_MS);
  }

  console.log('\n─── Resumen ───');
  console.log(`  ✅ Actualizadas: ${updated}`);
  console.log(`  ⚪ No disponibles: ${noPhoto}`);
  console.log(`  ❌ Errores:       ${errors}`);
  console.log(`  📊 Total:         ${telegramUsers.length}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal:', error);
  prisma.$disconnect();
  process.exit(1);
});
