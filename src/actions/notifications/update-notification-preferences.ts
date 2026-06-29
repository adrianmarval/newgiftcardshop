'use server';

import prisma from '@/lib/prisma';
import { authActionClient, ActionError } from '@/lib/safe-action';
import {
  updateNotificationPreferencesInputSchema,
  updateNotificationPreferencesOutputSchema,
} from './schemas';

export const updateNotificationPreferences = authActionClient
  .inputSchema(updateNotificationPreferencesInputSchema)
  .outputSchema(updateNotificationPreferencesOutputSchema)
  .action(async ({ ctx, parsedInput }) => {
    const userId = ctx.auth.user.id;
    const { telegramEnabled, whatsappEnabled, whatsappPhone, subscribedBrandCountryIds } = parsedInput;

    if (telegramEnabled === true) {
      const telegramUser = await prisma.telegramUser.findUnique({
        where: { userId },
        select: { telegramId: true },
      });
      if (!telegramUser) {
        throw new ActionError('Telegram no está vinculado. Vinculá tu cuenta antes de habilitar Notificaciones por Telegram.');
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
      include: { subscriptions: { select: { brandCountryId: true } } },
    });

    if (subscribedBrandCountryIds !== undefined) {
      const currentIds = new Set(preference.subscriptions.map((s) => s.brandCountryId));
      const newIds = new Set(subscribedBrandCountryIds);

      const toDelete = [...currentIds].filter((id) => !newIds.has(id));
      const toCreate = [...newIds].filter((id) => !currentIds.has(id));

      if (toDelete.length > 0) {
        await prisma.brandCountrySubscription.deleteMany({
          where: {
            preferenceId: preference.id,
            brandCountryId: { in: toDelete },
          },
        });
      }

      if (toCreate.length > 0) {
        await prisma.brandCountrySubscription.createMany({
          data: toCreate.map((brandCountryId) => ({
            preferenceId: preference.id,
            brandCountryId,
          })),
        });
      }
    }

    return {
      success: true as const,
      preference: {
        telegramEnabled: preference.telegramEnabled,
        whatsappEnabled: preference.whatsappEnabled,
        whatsappPhone: preference.whatsappPhone,
      },
    };
  });