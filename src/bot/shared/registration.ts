import prisma from '@/lib/prisma';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { auth } from '@/lib/auth';
import type { SellerContext, BuyerContext } from './types.js';
import { TelegramOtpTemplate } from '@/emails/telegram-otp';
import React from 'react';
import { renderUI, deleteUserInput } from './ui.js';

type BotRole = 'SELLER' | 'BUYER';
type Lang = 'en' | 'es';
type RegContext = SellerContext | BuyerContext;

const i18n = {
  en: {
    welcome: '👋 Welcome!\n\nTo get started, please enter your <b>email address.</b>',
    nameShort: '❌ Name too short. Please enter your full name.',
    helloName: '✅ Hello, <b>{name}</b>!\n\n📧 <b>What is your email address?</b>',
    invalidEmail: '❌ Invalid email format.\nExample: <code>user@gmail.com</code>',
    emailInUse: '⚠️ That email is already registered.\n\nTo link your Telegram account, we will send a verification code to your email.',
    emailLinkedElsewhere: '⚠️ This email is already linked to another Telegram account. Contact the administrator if you need help.',
    emailNotFound: '⚠️ No account found with this email. Please register first using /start.',
    otpSent:
      "📬 We sent a 6-digit code to <b>{email}</b>.\n\n🔐 <b>Enter the code:</b>\n\n<i>Code expires in 5 minutes. Check your spam folder if it doesn't arrive.</i>",
    otpSubject: '🔐 Your verification code',
    otpEmailError: '❌ Could not send the code. Please check the email and try again.',
    otpNotFound: '❌ No pending code found. Please enter your email again.',
    otpExpired: '⏰ The code has expired. Please enter your email again to receive a new one.',
    otpIncorrect: '❌ Incorrect code. Please check your email and try again.',
    emailVerified:
      '✅ <b>Email verified!</b>\n\n🔑 <b>Create your password:</b>\n\nRequirements:\n• Minimum 8 characters\n• At least one uppercase\n• At least one lowercase\n• At least one number\n\n<i>⚠️ Telegram messages are not encrypted. Use a unique password for this account.</i>',
    invalidPassword: '❌ Invalid password. It needs at least:\n• 8 characters\n• 1 uppercase\n• 1 lowercase\n• 1 number',
    sessionIncomplete: '❌ Incomplete session. Start over with /start.',
    accountCreated: `🎉 <b>Account created!</b>\n\nName: <b>{name}</b>\nEmail: <b>{email}</b>\n\n⏳ Your account is <b>awaiting activation</b> by the administrator.\n\n👉 <b>Please contact @${process.env.ADMIN_TELEGRAM_USERNAME} to activate it.</b>`,
    accountLinked: `🎉 <b>Account linked!</b>\n\nWelcome back, <b>{name}</b>!\nYour Telegram is now linked to <b>{email}</b>.\n\n⏳ Awaiting activation by the administrator.\n\n👉 <b>Please contact @${process.env.ADMIN_TELEGRAM_USERNAME} to activate it.</b>`,
    accountLinkedActive:
      '🎉 <b>Account linked!</b>\n\nWelcome back, <b>{name}</b>!\nYour Telegram is now linked to <b>{email}</b>.\n\nYou can now use the bot.',
    contactAdmin: 'Contact Admin',
    emailError: '❌ The email is already in use. Contact the administrator.',
    genericError: '❌ Error creating account. Try again or contact the administrator.',
  },
  es: {
    welcome: '👋 ¡Bienvenido!\n\nPara comenzar, por favor ingresa tu correo electrónico.',
    nameShort: '❌ Nombre muy corto. Ingresá tu nombre completo.',
    helloName: '✅ ¡Hola, <b>{name}</b>!\n\n📧 <b>¿Cuál es tu correo electrónico?</b>',
    invalidEmail: '❌ Email inválido. Ingresá un email con formato correcto.\nEjemplo: <code>usuario@gmail.com</code>',
    emailInUse: '⚠️ Ese email ya está registrado.\n\nPara vincular tu cuenta de Telegram, te enviamos un código de verificación al correo.',
    emailLinkedElsewhere: '⚠️ Este email ya está vinculado a otra cuenta de Telegram. Contactá al administrador si necesitás ayuda.',
    emailNotFound: '⚠️ No se encontró cuenta con este email. Por favor, registrate primero usando /start.',
    otpSent:
      '📬 Te enviamos un código de 6 dígitos a <b>{email}</b>.\n\n🔐 <b>Ingresá el código:</b>\n\n<i>El código expira en 5 minutos. Si no llega, revisá spam.</i>',
    otpSubject: '🔐 Tu código de verificación',
    otpEmailError: '❌ No pude enviar el código. Verificá el email e intentá de nuevo.',
    otpNotFound: '❌ No encontré un código pendiente. Ingresá tu email de nuevo.',
    otpExpired: '⏰ El código expiró. Ingresá tu email de nuevo para recibir uno nuevo.',
    otpIncorrect: '❌ Código incorrecto. Revisá el email e intentá de nuevo.',
    emailVerified:
      '✅ ¡Email verificado!\n\n🔑 Creá tu contraseña:\n\nRequisitos:\n• Mínimo 8 caracteres\n• Al menos una mayúscula\n• Al menos una minúscula\n• Al menos un número\n\n<i>⚠️ Tus mensajes en Telegram no son cifrados. Usá una contraseña única para esta cuenta.</i>',
    invalidPassword: '❌ Contraseña inválida. Necesita al menos:\n• 8 mayúscula\n• 1 minúscula\n• 1 número',
    sessionIncomplete: '❌ Sesión incompleta. Empezá de nuevo con /start.',
    accountCreated: `🎉 ¡Cuenta creada!\n\nNombre: <b>{name}</b>\nEmail: <b>{email}</b>\n\n⏳ Tu cuenta está pendiente de activación por el administrador.\n\n👉 <b>Por favor, contactá a @${process.env.ADMIN_TELEGRAM_USERNAME} para activarla.</b>`,
    accountLinked: `🎉 <b>¡Cuenta vinculada!</b>\n\n¡Bienvenido de nuevo, <b>{name}</b>!\nTu Telegram ahora está vinculado a <b>{email}</b>.\n\n⏳ Tu cuenta debe ser activada por el administrador.\n\n👉 <b>Por favor, contactá a @${process.env.ADMIN_TELEGRAM_USERNAME} para activarla.</b>`,
    accountLinkedActive:
      '🎉 <b>¡Cuenta vinculada!</b>\n\n¡Bienvenido de nuevo, <b>{name}</b>!\nTu Telegram ahora está vinculado a <b>{email}</b>.',
    contactAdmin: 'Contactar administrador',
    emailError: '❌ El email ya está en uso. Contactá al administrador.',
    genericError: '❌ Error al crear la cuenta. Intentá de nuevo o contactá al administrador.',
  },
};

function getLang(role: BotRole): Lang {
  return role === 'SELLER' ? 'en' : 'es';
}

async function getTelegramProfilePhotoUrl(ctx: RegContext, telegramId: string, botToken: string): Promise<string | null> {
  try {
    const photos = await ctx.api.getUserProfilePhotos(Number(telegramId), { limit: 1 });
    if (photos.total_count === 0) return null;

    const photo = photos.photos[0];
    if (!photo || photo.length === 0) return null;

    const largestPhoto = photo[photo.length - 1];
    const file = await ctx.api.getFile(largestPhoto.file_id);
    if (!file.file_path) return null;

    return `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
  } catch (error) {
    console.error('Error fetching Telegram profile photo:', error);
    return null;
  }
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpEmail(email: string, name: string, otp: string, lang: Lang): Promise<void> {
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: i18n[lang].otpSubject,
      react: React.createElement(TelegramOtpTemplate, {
        code: otp,
        userName: name,
      }),
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
}

export async function startRegistration(ctx: RegContext, role: BotRole): Promise<void> {
  const telegramId = ctx.from!.id.toString();
  const lang = getLang(role);

  const existing = await prisma.telegramUser.findUnique({
    where: { telegramId },
    include: { user: { select: { role: true } } },
  });

  if (existing && existing.user.role !== role) {
    const errorMsg =
      role === 'SELLER'
        ? '🚫 <b>Access denied.</b>\n\nYour account is not authorized to use this bot. Please contact the administrator if you think this is a mistake.'
        : '🚫 <b>Acceso denegado.</b>\n\nTu cuenta no está autorizada para usar este bot. Por favor, contactá al administrador si creés que es un error.';

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
  } catch (err) {
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
    } catch (err) {
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

  const record = await prisma.telegramOtp.findUnique({ where: { telegramId } });

  if (!record) {
    ctx.session.wizard.step = 'awaitingEmail';
    await renderUI(ctx, i18n[lang].otpNotFound);
    return;
  }

  if (record.expiresAt < new Date()) {
    await prisma.telegramOtp.delete({ where: { telegramId } });
    ctx.session.wizard.step = 'awaitingEmail';
    await renderUI(ctx, i18n[lang].otpExpired);
    return;
  }

  if (inputOtp !== record.otp) {
    await renderUI(ctx, i18n[lang].otpIncorrect);
    return;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: record.email },
    select: { id: true, name: true, role: true, isActive: true },
  });

  if (existingUser) {
    const botToken = role === 'SELLER' ? process.env.SELLER_BOT_TOKEN! : process.env.BUYER_BOT_TOKEN!;
    const photoUrl = await getTelegramProfilePhotoUrl(ctx, telegramId, botToken);

    await prisma.user.update({
      where: { id: existingUser.id },
      data: { emailVerified: true },
    });

    await prisma.telegramUser.upsert({
      where: { telegramId },
      update: { firstName, lastName, username, languageCode, photoUrl },
      create: { telegramId, firstName, lastName, username, languageCode, photoUrl, userId: existingUser.id },
    });

    await prisma.telegramOtp.delete({ where: { telegramId } }).catch(() => {});
    ctx.session.wizard = { step: 'idle' };

    if (existingUser.isActive) {
      await renderUI(ctx, i18n[lang].accountLinkedActive.replace('{name}', existingUser.name).replace('{email}', record.email), {
        parse_mode: 'HTML',
      });
      if (onFinish) {
        await onFinish();
      }
    } else {
      await renderUI(ctx, i18n[lang].accountLinked.replace('{name}', existingUser.name).replace('{email}', record.email), {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: i18n[lang].contactAdmin, url: `https://t.me/${process.env.ADMIN_TELEGRAM_USERNAME}` }]],
        },
      });
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
    const result = await (auth.api.signUpEmail as any)({
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
    const photoUrl = await getTelegramProfilePhotoUrl(ctx, telegramId, botToken);

    await prisma.user.update({
      where: { id: result.user.id },
      data: { emailVerified: true },
    });

    await prisma.telegramUser.create({
      data: { telegramId, firstName, lastName, username, languageCode, photoUrl, userId: result.user.id },
    });

    await prisma.telegramOtp.delete({ where: { telegramId } }).catch(() => {});
    ctx.session.wizard = { step: 'idle' };

    await renderUI(ctx, i18n[lang].accountCreated.replace('{name}', name).replace('{email}', email), {
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
