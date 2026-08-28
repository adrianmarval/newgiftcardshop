import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth/auth-server';
import { LEGACY_EMAIL_DOMAIN } from '@/lib/constants';
import { renderUI, deleteUserInput, escapeHTML } from './ui.js';
import {
  i18n as regI18n,
  getLang,
  generateOtp,
  sendOtpEmail,
  isValidEmail,
  isValidPassword,
  verifyTelegramOtp,
} from './registration.js';
import type { BotContext, BotRole } from './types.js';

/**
 * Web Claim: un usuario migrado (email legacy tg_<id>@legacy.migrated, sin
 * password) activa su acceso web desde el bot. Flujo: email real → OTP por
 * email → password. Al completarse, el User migra su email legacy al real
 * (emailVerified) y se crea el Account credential de Better Auth.
 *
 * El botón de entrada solo se renderiza si user.email termina en
 * LEGACY_EMAIL_DOMAIN — desaparece automáticamente tras el claim.
 */

const claimI18n = {
  en: {
    promptEmail:
      '🌐 <b>Activate web access</b>\n\nEnter the <b>email address</b> you will use to sign in to the web dashboard:',
    emailInUse: `❌ That email is already registered by another account.\n\n👉 Contact @${process.env.ADMIN_TELEGRAM_USERNAME} if you need help.`,
    alreadyActive: '✅ Your web access is already active. Sign in with <b>{email}</b>.',
    success:
      '🎉 <b>Web access activated!</b>\n\nYou can now sign in to the web dashboard with:\n📧 Email: <b>{email}</b>\n🔑 The password you just created.',
    error: '❌ Could not activate web access. Please try again or contact the administrator.',
  },
  es: {
    promptEmail:
      '🌐 <b>Activar acceso web</b>\n\nIngresa el <b>correo electrónico</b> que vas a usar para entrar al panel web:',
    emailInUse: `❌ Ese email ya está registrado por otra cuenta.\n\n👉 Contacta a @${process.env.ADMIN_TELEGRAM_USERNAME} si necesitas ayuda.`,
    alreadyActive: '✅ Tu acceso web ya está activo. Ingresa con <b>{email}</b>.',
    success:
      '🎉 <b>¡Acceso web activado!</b>\n\nYa puedes entrar al panel web con:\n📧 Email: <b>{email}</b>\n🔑 La contraseña que acabas de crear.',
    error: '❌ No se pudo activar el acceso web. Intenta de nuevo o contacta al administrador.',
  },
};

/** ¿El usuario todavía tiene email legacy (sin acceso web)? */
export function hasLegacyEmail(email: string): boolean {
  return email.endsWith(LEGACY_EMAIL_DOMAIN);
}

/** Texto de un mensaje de usuario (type-safe, sin casts). */
function messageText(ctx: BotContext): string | undefined {
  const msg = ctx.message;
  return msg && 'text' in msg ? msg.text?.trim() : undefined;
}

/** Entry point del wizard (callback claim_web_start). Requiere auth (ctx.user). */
export async function startWebClaim(ctx: BotContext, role: BotRole): Promise<void> {
  const lang = getLang(role);

  const user = await prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { email: true },
  });

  // Re-guard: si ya claimeó (doble clic, sesión vieja), no reiniciar el wizard
  if (!user || !hasLegacyEmail(user.email)) {
    await renderUI(ctx, claimI18n[lang].alreadyActive.replace('{email}', escapeHTML(user?.email ?? '')), {
      parse_mode: 'HTML',
    });
    return;
  }

  ctx.session.wizard.step = 'awaitingClaimEmail';
  ctx.session.wizard.claimEmail = undefined;
  await renderUI(ctx, claimI18n[lang].promptEmail, { parse_mode: 'HTML' });
}

export async function handleClaimEmail(ctx: BotContext, role: BotRole): Promise<void> {
  const lang = getLang(role);
  const email = messageText(ctx)?.toLowerCase();

  await deleteUserInput(ctx);

  if (!email || !isValidEmail(email)) {
    await renderUI(ctx, regI18n[lang].invalidEmail, { parse_mode: 'HTML' });
    return;
  }

  // El propio usuario tiene email legacy — cualquier hit es OTRO usuario
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    await renderUI(ctx, claimI18n[lang].emailInUse, { parse_mode: 'HTML' });
    return;
  }

  ctx.session.wizard.claimEmail = email;
  ctx.session.wizard.step = 'awaitingClaimOtp';

  const telegramId = ctx.from!.id.toString();
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.telegramOtp.upsert({
    where: { telegramId },
    update: { email, name: ctx.user.name, otp, expiresAt, attempts: 0 },
    create: { telegramId, email, name: ctx.user.name, otp, expiresAt },
  });

  try {
    await sendOtpEmail(email, ctx.user.name, otp, lang);
  } catch {
    ctx.session.wizard.step = 'awaitingClaimEmail';
    await renderUI(ctx, regI18n[lang].otpEmailError);
    return;
  }

  await renderUI(ctx, regI18n[lang].otpSent.replace('{email}', escapeHTML(email)), { parse_mode: 'HTML' });
}

export async function handleClaimOtp(ctx: BotContext, role: BotRole): Promise<void> {
  const lang = getLang(role);
  const inputOtp = messageText(ctx);
  const telegramId = ctx.from!.id.toString();

  await deleteUserInput(ctx);

  const { status, record } = await verifyTelegramOtp(telegramId, inputOtp);

  if (status === 'not_found') {
    ctx.session.wizard.step = 'awaitingClaimEmail';
    await renderUI(ctx, regI18n[lang].otpNotFound);
    return;
  }

  if (status === 'expired') {
    ctx.session.wizard.step = 'awaitingClaimEmail';
    await renderUI(ctx, regI18n[lang].otpExpired);
    return;
  }

  if (status === 'locked') {
    ctx.session.wizard.step = 'awaitingClaimEmail';
    await renderUI(ctx, regI18n[lang].otpIncorrect);
    return;
  }

  // Sanity: el OTP debe corresponder al email de ESTE claim
  if (status === 'incorrect' || !record || record.email !== ctx.session.wizard.claimEmail) {
    await renderUI(ctx, regI18n[lang].otpIncorrect);
    return;
  }

  await prisma.telegramOtp.delete({ where: { telegramId } }).catch(() => {});
  ctx.session.wizard.step = 'awaitingClaimPassword';

  await renderUI(ctx, regI18n[lang].emailVerified, { parse_mode: 'HTML' });
}

export async function handleClaimPassword(
  ctx: BotContext,
  role: BotRole,
  onFinish?: () => Promise<void>,
): Promise<void> {
  const lang = getLang(role);
  const password = messageText(ctx);

  await deleteUserInput(ctx);

  if (!password || !isValidPassword(password)) {
    await renderUI(ctx, regI18n[lang].invalidPassword);
    return;
  }

  const email = ctx.session.wizard.claimEmail;
  if (!email) {
    ctx.session.wizard.step = 'awaitingClaimEmail';
    await renderUI(ctx, regI18n[lang].sessionIncomplete);
    return;
  }

  // Re-guard: el usuario sigue siendo legacy (no claimeó por otra vía)
  const freshUser = await prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { email: true },
  });
  if (!freshUser || !hasLegacyEmail(freshUser.email)) {
    ctx.session.wizard = { step: 'idle' };
    await renderUI(ctx, claimI18n[lang].alreadyActive.replace('{email}', escapeHTML(freshUser?.email ?? '')), {
      parse_mode: 'HTML',
    });
    return;
  }

  try {
    // Mismo hashing que signUpEmail de Better Auth (scrypt por defecto)
    const authCtx = await auth.$context;
    const hash = await authCtx.password.hash(password);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: ctx.user.id },
        data: { email, emailVerified: true },
      });
      await tx.account.create({
        data: {
          accountId: ctx.user.id,
          providerId: 'credential',
          userId: ctx.user.id,
          password: hash,
        },
      });
    });
  } catch (err) {
    console.error('[WebClaim] Error:', err);
    // P2002: race condition — otro usuario tomó el email entre la validación y el tx
    if ((err as { code?: string })?.code === 'P2002') {
      ctx.session.wizard.step = 'awaitingClaimEmail';
      await renderUI(ctx, claimI18n[lang].emailInUse, { parse_mode: 'HTML' });
      return;
    }
    await renderUI(ctx, claimI18n[lang].error);
    return;
  }

  ctx.session.wizard = { step: 'idle' };

  await renderUI(ctx, claimI18n[lang].success.replace('{email}', escapeHTML(email)), { parse_mode: 'HTML' });

  // Renderiza el menú principal (ya sin el botón de claim)
  if (onFinish) {
    await onFinish();
  }
}
