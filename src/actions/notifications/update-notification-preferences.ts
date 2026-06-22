'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authActionClient, ActionError } from '@/lib/safe-action';

const updateNotificationPreferencesInputSchema = z.object({
  telegramEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  whatsappPhone: z.string().optional().nullable(),
});

export const updateNotificationPreferences = authActionClient
  .inputSchema(updateNotificationPreferencesInputSchema)
  .action(async ({ ctx, parsedInput }) => {
    const userId = ctx.auth.user.id;
    const { telegramEnabled, whatsappEnabled, whatsappPhone } = parsedInput;

    if (telegramEnabled === true) {
      const telegramUser = await prisma.telegramUser.findUnique({
        where: { userId },
        select: { telegramId: true },
      });
      if (!telegramUser) {
        throw new ActionError('Telegram no está vinculado. Vinculá tu cuenta antes de habilitar notificaciones por Telegram.');
      }
    }

    if (whatsappEnabled === true && !whatsappPhone) {
      throw new ActionError('Para habilitar WhatsApp debés ingresar tu número de teléfono.');
    }

    if (whatsappPhone) {
      const trimmed = whatsappPhone.trim();
      if (trimmed && !/^\+\d{6,15}$/.test(trimmed)) {
        throw new ActionError('El número de WhatsApp debe estar en formato E.164 (ej: +1234567890).');
      }
    }

    const data: {
      telegramEnabled?: boolean;
      whatsappEnabled?: boolean;
      whatsappPhone?: string | null;
    } = {};

    if (telegramEnabled !== undefined) data.telegramEnabled = telegramEnabled;
    if (whatsappEnabled !== undefined) data.whatsappEnabled = whatsappEnabled;
    if (whatsappPhone !== undefined) data.whatsappPhone = whatsappPhone?.trim() || null;

    const preference = await prisma.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        telegramEnabled: telegramEnabled ?? true,
        whatsappEnabled: whatsappEnabled ?? false,
        whatsappPhone: whatsappPhone?.trim() || null,
      },
    });

    return {
      success: true as const,
      preference: {
        telegramEnabled: preference.telegramEnabled,
        whatsappEnabled: preference.whatsappEnabled,
        whatsappPhone: preference.whatsappPhone,
      },
    };
  });
