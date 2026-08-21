import crypto from 'node:crypto';
import React from 'react';
import prisma from '@/lib/prisma';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { logger } from '@/lib/logger';
import { PinResetOtpTemplate } from '@/components/emails';
import { SECURITY_UNLOCK_MINUTES, PIN_MAX_ATTEMPTS, PIN_RESET_OTP_MINUTES, PIN_RESET_COOLDOWN_SECONDS } from '@/lib/constants';

/**
 * Security PIN service — gates the REVEAL of giftcard codes (web + bots).
 *
 * Business rules:
 * - An order requires unlock iff it has at least one card with isConfirmed=false
 *   (codes not yet applied by the buyer). Fully-confirmed orders bypass the gate.
 * - A successful PIN/passkey verification unlocks ALL reveals for
 *   SECURITY_UNLOCK_MINUTES, cross-channel (web session + Telegram bot).
 * - PIN: 4-6 digits, scrypt-hashed. 5 failed attempts → locked, recovery only
 *   via email OTP (PinResetOtp, CSPRNG, 10 min expiry, 5 attempts).
 */

export type SecurityPinErrorCode =
  | 'PIN_NOT_SET'
  | 'PIN_LOCKED'
  | 'PIN_INVALID'
  | 'PIN_FORMAT_INVALID'
  | 'OTP_NOT_FOUND'
  | 'OTP_EXPIRED'
  | 'OTP_INVALID'
  | 'OTP_MAX_ATTEMPTS'
  | 'OTP_COOLDOWN';

export class SecurityPinError extends Error {
  constructor(
    public readonly code: SecurityPinErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SecurityPinError';
  }
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

/** An order's codes are stealable while any card is unconfirmed. */
export function orderNeedsSecurityGate(giftcards: { isConfirmed: boolean }[]): boolean {
  return giftcards.some((c) => !c.isConfirmed);
}

function hashPin(pin: string, salt?: string): string {
  const useSalt = salt ?? crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pin, useSalt, 32).toString('hex');
  return `${useSalt}:${hash}`;
}

function verifyPinHash(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(pin, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

// ── Status / unlock window ───────────────────────────────────────────────────

export interface SecurityStatus {
  hasPin: boolean;
  hasPasskey: boolean;
  pinLocked: boolean;
  isUnlocked: boolean;
  unlockedUntil: Date | null;
}

export async function getSecurityStatus(userId: string): Promise<SecurityStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      securityPinHash: true,
      pinLocked: true,
      securityUnlockedUntil: true,
      _count: { select: { passkeys: true } },
    },
  });
  if (!user) throw new SecurityPinError('PIN_NOT_SET', 'Usuario no encontrado');
  const unlocked = user.securityUnlockedUntil !== null && user.securityUnlockedUntil > new Date();
  return {
    hasPin: user.securityPinHash !== null,
    hasPasskey: user._count.passkeys > 0,
    pinLocked: user.pinLocked,
    isUnlocked: unlocked,
    unlockedUntil: unlocked ? user.securityUnlockedUntil : null,
  };
}

export async function isSecurityUnlocked(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { securityUnlockedUntil: true },
  });
  return user?.securityUnlockedUntil != null && user.securityUnlockedUntil > new Date();
}

export async function grantSecurityUnlock(userId: string): Promise<Date> {
  const until = new Date(Date.now() + SECURITY_UNLOCK_MINUTES * 60 * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: { securityUnlockedUntil: until },
  });
  return until;
}

// ── PIN verification / setup ─────────────────────────────────────────────────

/**
 * Verifies the PIN with lockout accounting (5 attempts → locked).
 * Throws SecurityPinError with a user-facing message on failure.
 */
export async function verifySecurityPin(userId: string, pin: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { securityPinHash: true, pinFailedAttempts: true, pinLocked: true },
  });
  if (!user?.securityPinHash) {
    throw new SecurityPinError('PIN_NOT_SET', 'No tenés un PIN de seguridad configurado.');
  }
  if (user.pinLocked) {
    throw new SecurityPinError('PIN_LOCKED', 'Tu PIN está bloqueado por intentos fallidos. Restablecelo con el código enviado a tu email.');
  }

  if (!verifyPinHash(pin, user.securityPinHash)) {
    const attempts = user.pinFailedAttempts + 1;
    const locked = attempts >= PIN_MAX_ATTEMPTS;
    await prisma.user.update({
      where: { id: userId },
      data: { pinFailedAttempts: attempts, pinLocked: locked },
    });
    logger.warn('PIN de seguridad inválido', {
      flow: 'auth',
      action: 'security-pin-verify-failed',
      userId,
      metadata: { attempts, locked },
    });
    if (locked) {
      throw new SecurityPinError('PIN_LOCKED', 'PIN bloqueado por demasiados intentos. Restablecelo con el código enviado a tu email.');
    }
    throw new SecurityPinError('PIN_INVALID', `PIN incorrecto. Te quedan ${PIN_MAX_ATTEMPTS - attempts} intento(s).`);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { pinFailedAttempts: 0 },
  });
}

/**
 * Verifies the PIN and, on success, grants the unlock window.
 * Throws SecurityPinError with a user-facing message otherwise.
 */
export async function verifyPinAndUnlock(userId: string, pin: string): Promise<Date> {
  await verifySecurityPin(userId, pin);
  logger.action('auth', 'security-pin-unlock', 'Desbloqueo de códigos via PIN', { userId });
  return grantSecurityUnlock(userId);
}

/** Sets the PIN for a user that does NOT have one yet (initial setup). */
export async function setSecurityPin(userId: string, pin: string): Promise<void> {
  if (!isValidPinFormat(pin)) {
    throw new SecurityPinError('PIN_FORMAT_INVALID', 'El PIN debe tener entre 4 y 6 dígitos numéricos.');
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { securityPinHash: true },
  });
  if (user?.securityPinHash) {
    throw new SecurityPinError('PIN_FORMAT_INVALID', 'Ya tenés un PIN configurado. Usá la opción de cambiar PIN.');
  }
  await prisma.user.update({
    where: { id: userId },
    data: { securityPinHash: hashPin(pin), pinFailedAttempts: 0, pinLocked: false },
  });
  logger.action('auth', 'security-pin-set', 'PIN de seguridad configurado', { userId });
}

/** Changes an existing PIN (requires the current one, with lockout accounting). */
export async function changeSecurityPin(userId: string, currentPin: string, newPin: string): Promise<void> {
  if (!isValidPinFormat(newPin)) {
    throw new SecurityPinError('PIN_FORMAT_INVALID', 'El PIN debe tener entre 4 y 6 dígitos numéricos.');
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { securityPinHash: true },
  });
  if (!user?.securityPinHash) {
    throw new SecurityPinError('PIN_NOT_SET', 'No tenés un PIN de seguridad configurado.');
  }
  await verifySecurityPin(userId, currentPin);
  await prisma.user.update({
    where: { id: userId },
    data: { securityPinHash: hashPin(newPin), pinFailedAttempts: 0 },
  });
  logger.action('auth', 'security-pin-change', 'PIN de seguridad actualizado', { userId });
}

// ── PIN reset via email OTP ──────────────────────────────────────────────────

export async function requestPinReset(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, securityPinHash: true },
  });
  if (!user) throw new SecurityPinError('PIN_NOT_SET', 'Usuario no encontrado.');
  if (!user.securityPinHash) {
    throw new SecurityPinError('PIN_NOT_SET', 'No tenés un PIN configurado — no hay nada que restablecer.');
  }

  const existing = await prisma.pinResetOtp.findUnique({ where: { userId } });
  if (existing && Date.now() - existing.createdAt.getTime() < PIN_RESET_COOLDOWN_SECONDS * 1000) {
    throw new SecurityPinError('OTP_COOLDOWN', 'Ya enviamos un código hace un momento. Revisá tu email o esperá unos segundos.');
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + PIN_RESET_OTP_MINUTES * 60 * 1000);

  await prisma.pinResetOtp.upsert({
    where: { userId },
    create: { userId, otp, expiresAt },
    update: { otp, attempts: 0, expiresAt, createdAt: new Date() },
  });

  // No swallow: si el email falla, el usuario debe saberlo.
  await resend.emails.send({
    from: EMAIL_FROM,
    to: user.email,
    subject: 'Restablecé tu PIN de seguridad',
    react: React.createElement(PinResetOtpTemplate, { code: otp, userName: user.name }),
  });

  logger.action('auth', 'security-pin-reset-requested', 'OTP de reseteo de PIN enviado', { userId });
}

/**
 * Validates the email OTP (with attempt tracking) WITHOUT consuming the record.
 * Used for early validation in the bot flow so the user gets immediate feedback.
 */
export async function verifyPinResetOtp(userId: string, otp: string): Promise<void> {
  const record = await prisma.pinResetOtp.findUnique({ where: { userId } });
  if (!record) {
    throw new SecurityPinError('OTP_NOT_FOUND', 'No hay un código de recuperación activo. Solicitá uno nuevo.');
  }
  if (record.expiresAt < new Date()) {
    await prisma.pinResetOtp.delete({ where: { userId } });
    throw new SecurityPinError('OTP_EXPIRED', 'El código expiró. Solicitá uno nuevo.');
  }
  if (record.attempts >= PIN_MAX_ATTEMPTS) {
    await prisma.pinResetOtp.delete({ where: { userId } });
    throw new SecurityPinError('OTP_MAX_ATTEMPTS', 'Demasiados intentos fallidos. Solicitá un nuevo código.');
  }
  if (record.otp !== otp) {
    await prisma.pinResetOtp.update({
      where: { userId },
      data: { attempts: { increment: 1 } },
    });
    throw new SecurityPinError('OTP_INVALID', 'Código incorrecto. Revisá tu email e intentá de nuevo.');
  }
}

/**
 * Verifies the email OTP and sets a new PIN. Clears the lockout on success.
 */
export async function confirmPinReset(userId: string, otp: string, newPin: string): Promise<void> {
  if (!isValidPinFormat(newPin)) {
    throw new SecurityPinError('PIN_FORMAT_INVALID', 'El PIN debe tener entre 4 y 6 dígitos numéricos.');
  }

  const record = await prisma.pinResetOtp.findUnique({ where: { userId } });
  if (!record) {
    throw new SecurityPinError('OTP_NOT_FOUND', 'No hay un código de recuperación activo. Solicitá uno nuevo.');
  }
  if (record.expiresAt < new Date()) {
    await prisma.pinResetOtp.delete({ where: { userId } });
    throw new SecurityPinError('OTP_EXPIRED', 'El código expiró. Solicitá uno nuevo.');
  }
  if (record.attempts >= PIN_MAX_ATTEMPTS) {
    await prisma.pinResetOtp.delete({ where: { userId } });
    throw new SecurityPinError('OTP_MAX_ATTEMPTS', 'Demasiados intentos fallidos. Solicitá un nuevo código.');
  }

  if (record.otp !== otp) {
    await prisma.pinResetOtp.update({
      where: { userId },
      data: { attempts: { increment: 1 } },
    });
    throw new SecurityPinError('OTP_INVALID', 'Código incorrecto. Revisá tu email e intentá de nuevo.');
  }

  await prisma.$transaction([
    prisma.pinResetOtp.delete({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: { securityPinHash: hashPin(newPin), pinFailedAttempts: 0, pinLocked: false },
    }),
  ]);
  logger.action('auth', 'security-pin-reset', 'PIN de seguridad restablecido via email OTP', { userId });
}
