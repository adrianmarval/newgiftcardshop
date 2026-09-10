// ─────────────────────────────────────────────────────────────────────────────
// Telegram OTP — generación (CSPRNG), envío por email y verificación con
// lockout. Compartido por el wizard de registro y el web-claim.
// ─────────────────────────────────────────────────────────────────────────────

import prisma from '@/lib/prisma';
import type { TelegramOtp } from '@/generated/prisma/client';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { TelegramOtpTemplate } from '@/emails';
import React from 'react';
import { randomInt } from 'node:crypto';
import type { Lang } from './types.js';
import { i18n } from './registration-i18n.js';

export function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

export async function sendOtpEmail(email: string, name: string, otp: string, lang: Lang): Promise<void> {
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

export type TelegramOtpVerifyStatus = 'ok' | 'not_found' | 'expired' | 'locked' | 'incorrect';

/**
 * Verifica el OTP de Telegram con lockout (5 intentos) y expiración.
 * Efectos colaterales: borra el registro si expiró o se lockeó, incrementa
 * attempts si el código no matchea. Devuelve el record solo cuando status='ok'.
 */
export async function verifyTelegramOtp(
  telegramId: string,
  inputOtp: string | undefined,
): Promise<{ status: TelegramOtpVerifyStatus; record?: TelegramOtp }> {
  const record = await prisma.telegramOtp.findUnique({ where: { telegramId } });

  if (!record) return { status: 'not_found' };

  if (record.expiresAt < new Date()) {
    await prisma.telegramOtp.delete({ where: { telegramId } });
    return { status: 'expired' };
  }

  if (record.attempts >= 5) {
    await prisma.telegramOtp.delete({ where: { telegramId } });
    return { status: 'locked' };
  }

  if (inputOtp !== record.otp) {
    await prisma.telegramOtp.update({
      where: { telegramId },
      data: { attempts: { increment: 1 } },
    });
    return { status: 'incorrect' };
  }

  return { status: 'ok', record };
}
