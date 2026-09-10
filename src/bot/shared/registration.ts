// ─────────────────────────────────────────────────────────────────────────────
// Registration — wizard de registro de usuarios nuevos (email → nombre → OTP →
// password). El linking por deep-link vive en ./telegram-linking.ts, el OTP en
// ./telegram-otp.ts, el i18n en ./registration-i18n.ts y la foto de perfil en
// ./telegram-photo.ts. Este módulo re-exporta todo para compatibilidad con los
// imports existentes (web-claim, bots).
// ─────────────────────────────────────────────────────────────────────────────

import prisma from '@/lib/prisma';
import { authApi } from '@/lib/auth/auth-server';
import type { BotContext, BotRole } from './types.js';
import { renderUI, deleteUserInput, escapeHTML } from './ui.js';
import { i18n, getLang } from './registration-i18n.js';
import { generateOtp, sendOtpEmail, verifyTelegramOtp } from './telegram-otp.js';
import { fetchAndEncryptTelegramPhoto } from './telegram-photo.js';
import { tryHandleLinkDeepLink } from './telegram-linking.js';

export { i18n, getLang } from './registration-i18n.js';
export { generateOtp, sendOtpEmail, verifyTelegramOtp } from './telegram-otp.js';
export type { TelegramOtpVerifyStatus } from './telegram-otp.js';
export { fetchAndEncryptTelegramPhoto } from './telegram-photo.js';
export { handleLinkConfirmation } from './telegram-linking.js';

type RegContext = BotContext;

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
}

export async function startRegistration(ctx: RegContext, role: BotRole, startParam?: string): Promise<void> {
  const telegramId = ctx.from!.id.toString();
  const lang = getLang(role);

  // Deep link de vinculación (lt_*) — flujo delegado a telegram-linking
  if (await tryHandleLinkDeepLink(ctx, role, startParam)) return;

  const existing = await prisma.telegramUser.findUnique({
    where: { telegramId },
    include: { user: { select: { role: true } } },
  });

  if (existing && existing.user.role !== role) {
    const errorMsg =
      role === 'SELLER'
        ? '🚫 <b>Access denied.</b>\n\nYour account is not authorized to use this bot. Please contact the administrator if you think this is a mistake.'
        : '🚫 <b>Acceso denegado.</b>\n\nTu cuenta no está autorizada para usar este bot. Por favor, contacta al administrador si crees que es un error.';

    await renderUI(ctx, errorMsg, { parse_mode: 'HTML' });
    return;
  }

  if (!ctx.session.wizard) {
    ctx.session.wizard = { step: 'idle' };
  }
  ctx.session.wizard.step = 'awaitingEmail';
  await renderUI(ctx, i18n[lang].welcome, { parse_mode: 'HTML' });
}

export async function handleRegName(ctx: RegContext, role: BotRole): Promise<void> {
  const lang = getLang(role);
  const name = (ctx.message as any)?.text?.trim() as string | undefined;

  await deleteUserInput(ctx);

  if (!name || name.length < 2) {
    await renderUI(ctx, i18n[lang].nameShort);
    return;
  }

  ctx.session.wizard.regName = name;
  ctx.session.wizard.step = 'awaitingOtp';

  const email = ctx.session.wizard.regEmail!;
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const telegramId = ctx.from!.id.toString();

  await prisma.telegramOtp.upsert({
    where: { telegramId },
    update: { email, name, otp, expiresAt },
    create: { telegramId, email, name, otp, expiresAt },
  });

  try {
    await sendOtpEmail(email, name, otp, lang);
  } catch (_err) {
    ctx.session.wizard.step = 'awaitingName';
    await renderUI(ctx, i18n[lang].otpEmailError);
    return;
  }

  await renderUI(ctx, i18n[lang].otpSent.replace('{email}', email), { parse_mode: 'HTML' });
}

export async function handleRegEmail(ctx: RegContext, role: BotRole): Promise<void> {
  const lang = getLang(role);
  const email = (ctx.message as any)?.text?.trim()?.toLowerCase() as string | undefined;

  await deleteUserInput(ctx);

  if (!email || !isValidEmail(email)) {
    await renderUI(ctx, i18n[lang].invalidEmail, { parse_mode: 'HTML' });
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { telegramUser: { select: { telegramId: true } } },
  });

  if (existing) {
    if (existing.telegramUser) {
      await renderUI(ctx, i18n[lang].emailLinkedElsewhere, { parse_mode: 'HTML' });
      return;
    }

    await renderUI(ctx, i18n[lang].emailInUse, { parse_mode: 'HTML' });

    ctx.session.wizard.regEmail = email;
    ctx.session.wizard.isLinking = true;
    ctx.session.wizard.step = 'awaitingOtp';

    const name = existing.name;
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const telegramId = ctx.from!.id.toString();

    await prisma.telegramOtp.upsert({
      where: { telegramId },
      update: { email, name, otp, expiresAt },
      create: { telegramId, email, name, otp, expiresAt },
    });

    try {
      await sendOtpEmail(email, name, otp, lang);
    } catch (_err) {
      ctx.session.wizard.step = 'awaitingEmail';
      await renderUI(ctx, i18n[lang].otpEmailError);
      return;
    }

    await renderUI(ctx, i18n[lang].otpSent.replace('{email}', email), { parse_mode: 'HTML' });
    return;
  }

  ctx.session.wizard.regEmail = email;
  ctx.session.wizard.step = 'awaitingName';

  const namePrompt =
    lang === 'en' ? `📝 What is your <b>full name?</b>\n e.g. John Doe` : `📝 ¿Cuál es tu <b>nombre completo?</b>\n e.g. John Doe`;
  await renderUI(ctx, namePrompt, { parse_mode: 'HTML' });
}

export async function handleRegOtp(ctx: RegContext, role: BotRole, onFinish?: () => Promise<any>): Promise<void> {
  const lang = getLang(role);
  const inputOtp = (ctx.message as any)?.text?.trim() as string | undefined;
  const telegramId = ctx.from!.id.toString();
  const { first_name: firstName, last_name: lastName, username, language_code: languageCode } = ctx.from!;

  await deleteUserInput(ctx);

  const { status, record } = await verifyTelegramOtp(telegramId, inputOtp);

  if (status === 'not_found') {
    ctx.session.wizard.step = 'awaitingEmail';
    await renderUI(ctx, i18n[lang].otpNotFound);
    return;
  }

  if (status === 'expired') {
    ctx.session.wizard.step = 'awaitingEmail';
    await renderUI(ctx, i18n[lang].otpExpired);
    return;
  }

  if (status === 'locked') {
    ctx.session.wizard.step = 'awaitingEmail';
    await renderUI(ctx, i18n[lang].otpIncorrect);
    return;
  }

  if (status === 'incorrect' || !record) {
    await renderUI(ctx, i18n[lang].otpIncorrect);
    return;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: record.email },
    select: { id: true, name: true, role: true, isActive: true },
  });

  if (existingUser) {
    const botToken = role === 'SELLER' ? process.env.SELLER_BOT_TOKEN! : process.env.BUYER_BOT_TOKEN!;
    const photoResult = await fetchAndEncryptTelegramPhoto(ctx, telegramId, botToken);

    await prisma.user.update({
      where: { id: existingUser.id },
      data: { emailVerified: true },
    });

    await prisma.telegramUser.upsert({
      where: { telegramId },
      update: {
        firstName,
        lastName,
        username,
        languageCode,
        // Preservar el topic "🤖 Menú" creado durante el registro (si existe en sesión)
        ...(ctx.session.flowTopicId != null
          ? { flowTopicId: ctx.session.flowTopicId, flowChatId: ctx.session.flowChatId ?? null }
          : {}),
        ...(photoResult ? { photoData: new Uint8Array(photoResult.data), photoMimeType: photoResult.mimeType } : {}),
      },
      create: {
        telegramId,
        firstName,
        lastName,
        username,
        languageCode,
        // Preservar el topic "🤖 Menú" creado durante el registro (si existe en sesión)
        flowTopicId: ctx.session.flowTopicId ?? undefined,
        flowChatId: ctx.session.flowChatId ?? undefined,
        photoData: photoResult ? new Uint8Array(photoResult.data) : undefined,
        photoMimeType: photoResult?.mimeType,
        userId: existingUser.id,
      },
    });

    await prisma.telegramOtp.delete({ where: { telegramId } }).catch(() => {});
    ctx.session.wizard = { step: 'idle' };

    if (existingUser.isActive) {
      await renderUI(
        ctx,
        i18n[lang].accountLinkedActive.replace('{name}', escapeHTML(existingUser.name)).replace('{email}', escapeHTML(record.email)),
        {
          parse_mode: 'HTML',
        },
      );
      if (onFinish) {
        await onFinish();
      }
    } else {
      await renderUI(
        ctx,
        i18n[lang].accountLinked.replace('{name}', escapeHTML(existingUser.name)).replace('{email}', escapeHTML(record.email)),
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: i18n[lang].contactAdmin, url: `https://t.me/${process.env.ADMIN_TELEGRAM_USERNAME}` }]],
          },
        },
      );
    }
    return;
  }

  ctx.session.wizard.regEmail = record.email;
  ctx.session.wizard.regName = record.name;
  ctx.session.wizard.step = 'awaitingPassword';

  await renderUI(ctx, i18n[lang].emailVerified, { parse_mode: 'HTML' });
}

export async function handleRegPassword(ctx: RegContext, role: BotRole): Promise<void> {
  const lang = getLang(role);
  const password = (ctx.message as any)?.text?.trim() as string | undefined;

  await deleteUserInput(ctx);

  if (!password || !isValidPassword(password)) {
    await renderUI(ctx, i18n[lang].invalidPassword);
    return;
  }

  const { regName: name, regEmail: email } = ctx.session.wizard;
  const telegramId = ctx.from!.id.toString();
  const { first_name: firstName, last_name: lastName, username, language_code: languageCode } = ctx.from!;

  if (!name || !email) {
    ctx.session.wizard.step = 'awaitingName';
    await renderUI(ctx, i18n[lang].sessionIncomplete);
    return;
  }

  try {
    const result = await authApi.signUpEmail({
      body: {
        name,
        email,
        password,
        role,
        isActive: false,
        callbackURL: role === 'SELLER' ? '/sell/dashboard' : '/store/dashboard',
      },
    });

    if (!result?.user?.id) throw new Error('signUpEmail failed');

    const botToken = role === 'SELLER' ? process.env.SELLER_BOT_TOKEN! : process.env.BUYER_BOT_TOKEN!;
    const photoResult = await fetchAndEncryptTelegramPhoto(ctx, telegramId, botToken);

    await prisma.user.update({
      where: { id: result.user.id },
      data: { emailVerified: true },
    });

    await prisma.telegramUser.create({
      data: {
        telegramId,
        firstName,
        lastName,
        username,
        languageCode,
        // Preservar el topic "🤖 Menú" creado durante el registro (si existe en sesión)
        flowTopicId: ctx.session.flowTopicId ?? undefined,
        flowChatId: ctx.session.flowChatId ?? undefined,
        photoData: photoResult ? new Uint8Array(photoResult.data) : undefined,
        photoMimeType: photoResult?.mimeType,
        userId: result.user.id,
      },
    });

    await prisma.telegramOtp.delete({ where: { telegramId } }).catch(() => {});
    ctx.session.wizard = { step: 'idle' };

    await renderUI(ctx, i18n[lang].accountCreated.replace('{name}', escapeHTML(name)).replace('{email}', escapeHTML(email)), {
      parse_mode: 'HTML',
      reply_markup: {
        remove_keyboard: true,
        inline_keyboard: [[{ text: i18n[lang].contactAdmin, url: `https://t.me/${process.env.ADMIN_TELEGRAM_USERNAME}` }]],
      },
    });
  } catch (err: any) {
    console.error('[Registration] Error:', err);
    ctx.session.wizard.step = 'awaitingPassword';

    const msg = err?.body?.message ?? err?.message ?? '';
    if (msg.toLowerCase().includes('email')) {
      await renderUI(ctx, i18n[lang].emailError);
    } else {
      await renderUI(ctx, i18n[lang].genericError);
    }
  }
}
