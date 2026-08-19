'use server';

import { randomBytes } from 'node:crypto';
import { authActionClient } from '@/lib/safe-action';
import prisma from '@/lib/prisma';
import type { SessionUser } from '@/types/auth/session';

const TOKEN_EXPIRY_HOURS = 24;
// Telegram deep-link ?start= parameter: max 64 chars, A-Za-z0-9_- only.
// "lt_" (3) + 60 hex chars (30 bytes = 240 bits) = 63 chars.
const TOKEN_BYTE_LENGTH = 30;

export const generateTelegramLink = authActionClient.action(async ({ ctx }) => {
  const user = ctx.auth.user as SessionUser;
  const userId = user.id;
  const botUsername = user.role === 'SELLER'
    ? process.env.SELLER_BOT_USERNAME
    : process.env.BUYER_BOT_USERNAME;

  if (!botUsername) {
    return { error: 'Bot not configured' };
  }

  // Invalidate any existing unused tokens for this user
  await prisma.telegramLinkToken.deleteMany({
    where: { userId, usedAt: null },
  });

  // Generate a cryptographically secure token
  const token = `lt_${randomBytes(TOKEN_BYTE_LENGTH).toString('hex')}`;
  if (token.length > 64) {
    throw new Error(`Token length ${token.length} exceeds Telegram deep-link limit of 64 chars`);
  }
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.telegramLinkToken.create({
    data: { userId, token, expiresAt },
  });

  const deepLink = `https://t.me/${botUsername}?start=${token}`;

  return { deepLink };
});
