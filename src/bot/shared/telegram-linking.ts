// ─────────────────────────────────────────────────────────────────────────────
// Telegram Linking — deep-links lt_* (vincular cuenta web existente con
// Telegram) y la confirmación del vínculo. El wizard de registro delega acá
// cuando /start llega con un token de linking.
// ─────────────────────────────────────────────────────────────────────────────

import prisma from '@/lib/prisma';
import { InlineKeyboard } from 'grammy';
import type { BotContext, BotRole } from './types.js';
import { renderUI, escapeHTML } from './ui.js';
import { i18n, getLang } from './registration-i18n.js';
import { fetchAndEncryptTelegramPhoto } from './telegram-photo.js';

type RegContext = BotContext;

/**
 * Maneja el deep link lt_* si startParam es un token de linking.
 * Devuelve true si el flujo fue manejado (startRegistration NO debe seguir).
 */
export async function tryHandleLinkDeepLink(ctx: RegContext, role: BotRole, startParam?: string): Promise<boolean> {
  if (!startParam?.startsWith('lt_')) return false;

  const telegramId = ctx.from!.id.toString();
  const lang = getLang(role);
  const token = startParam;

  const telegramUser = await prisma.telegramUser.findUnique({
    where: { telegramId },
    include: { user: { select: { role: true } } },
  });

  if (telegramUser) {
    await renderUI(ctx, i18n[lang].accountLinkedActive.replace('{name}', escapeHTML(telegramUser.user.role)).replace('{email}', ''), {
      parse_mode: 'HTML',
    });
    return true;
  }

  const linkToken = await prisma.telegramLinkToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true } } },
  });

  if (!linkToken) {
    await renderUI(ctx, lang === 'en'
      ? '❌ Invalid or expired link. Please try again from the web dashboard.'
      : '❌ Enlace inválido o expirado. Intenta de nuevo desde el panel web.', { parse_mode: 'HTML' });
    return true;
  }

  if (linkToken.usedAt) {
    await renderUI(ctx, lang === 'en'
      ? '❌ This link has already been used.'
      : '❌ Este enlace ya fue utilizado.', { parse_mode: 'HTML' });
    return true;
  }

  if (linkToken.expiresAt < new Date()) {
    await prisma.telegramLinkToken.delete({ where: { token } });
    await renderUI(ctx, lang === 'en'
      ? '❌ This link has expired. Please generate a new one from the web dashboard.'
      : '❌ Este enlace expiró. Genera uno nuevo desde el panel web.', { parse_mode: 'HTML' });
    return true;
  }

  if (linkToken.user.role !== role) {
    const errorMsg = role === 'SELLER'
      ? '🚫 <b>Access denied.</b>\n\nYour account is not authorized to use this bot.'
      : '🚫 <b>Acceso denegado.</b>\n\nTu cuenta no está autorizada para usar este bot.';
    await renderUI(ctx, errorMsg, { parse_mode: 'HTML' });
    return true;
  }

  // Guardar datos en sesión para confirmación
  ctx.session.wizard.step = 'awaitingLinkConfirmation';
  ctx.session.wizard.linkToken = token;
  ctx.session.wizard.linkUserName = linkToken.user.name;
  ctx.session.wizard.linkUserEmail = linkToken.user.email;

  const kb = new InlineKeyboard()
    .text(i18n[lang].linkConfirm, 'link_confirm')
    .row()
    .text(i18n[lang].linkCancel, 'link_cancel');

  await renderUI(
    ctx,
    i18n[lang].linkConfirmation
      .replace('{name}', escapeHTML(linkToken.user.name))
      .replace('{email}', escapeHTML(linkToken.user.email)),
    { parse_mode: 'HTML', reply_markup: kb },
  );
  return true;
}

export async function handleLinkConfirmation(
  ctx: RegContext,
  role: BotRole,
  confirmed: boolean,
  onFinish?: () => Promise<any>,
): Promise<void> {
  const lang = getLang(role);
  const telegramId = ctx.from!.id.toString();
  const { linkToken: token, linkUserName: name, linkUserEmail: email } = ctx.session.wizard;

  if (!token || !name || !email) {
    ctx.session.wizard = { step: 'idle' };
    await renderUI(ctx, i18n[lang].sessionIncomplete);
    return;
  }

  if (!confirmed) {
    ctx.session.wizard = { step: 'idle' };
    await renderUI(ctx, i18n[lang].linkCancelled);
    return;
  }

  const linkToken = await prisma.telegramLinkToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, role: true, isActive: true } } },
  });

  if (!linkToken || linkToken.usedAt || linkToken.expiresAt < new Date() || linkToken.user.role !== role) {
    ctx.session.wizard = { step: 'idle' };
    await renderUI(ctx, lang === 'en'
      ? '❌ This link is no longer valid. Please generate a new one from the web dashboard.'
       : '❌ Este enlace ya no es válido. Genera uno nuevo desde el panel web.', { parse_mode: 'HTML' });
    return;
  }

  const botToken = role === 'SELLER' ? process.env.SELLER_BOT_TOKEN! : process.env.BUYER_BOT_TOKEN!;
  const photoResult = await fetchAndEncryptTelegramPhoto(ctx, telegramId, botToken);
  const { first_name: firstName, last_name: lastName, username, language_code: languageCode } = ctx.from!;

  await prisma.telegramUser.create({
    data: {
      telegramId,
      firstName,
      lastName,
      username,
      languageCode,
      flowTopicId: ctx.session.flowTopicId ?? undefined,
      flowChatId: ctx.session.flowChatId ?? undefined,
      photoData: photoResult ? new Uint8Array(photoResult.data) : undefined,
      photoMimeType: photoResult?.mimeType,
      userId: linkToken.user.id,
    },
  });

  await prisma.telegramLinkToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  await prisma.user.update({
    where: { id: linkToken.user.id },
    data: { emailVerified: true },
  });

  ctx.session.wizard = { step: 'idle' };

  if (linkToken.user.isActive) {
    const kb = role === 'SELLER'
      ? new InlineKeyboard()
          .text('📦 View My Batches', 'my_batches')
          .row()
          .text('➕ Sell Giftcards', 'sell_start')
          .row()
          .text('💰 Wallet', 'wallet')
      : new InlineKeyboard()
          .text('📋 Ver Mis órdenes', 'my_orders')
          .row()
          .text('🛒 Comprar tarjetas', 'buy_start');

    await renderUI(
      ctx,
      i18n[lang].accountLinkedActive
        .replace('{name}', escapeHTML(name))
        .replace('{email}', escapeHTML(email)),
      { parse_mode: 'HTML', reply_markup: kb },
    );
    if (onFinish) {
      await onFinish();
    }
  } else {
    await renderUI(
      ctx,
      i18n[lang].accountLinked
        .replace('{name}', escapeHTML(name))
        .replace('{email}', escapeHTML(email)),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: i18n[lang].contactAdmin, url: `https://t.me/${process.env.ADMIN_TELEGRAM_USERNAME}` }]],
        },
      },
    );
  }
}
