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
    const { telegramEnabled, subscribedBrandCountryIds } = parsedInput;

    if (telegramEnabled === true) {
      const telegramUser = await prisma.telegramUser.findUnique({
        where: { userId },
        select: { telegramId: true },
      });
      if (!telegramUser) {
        throw new ActionError('Telegram no está vinculado. Vinculá tu cuenta antes de habilitar Notificaciones por Telegram.');
      }
    }

    const data: {
      telegramEnabled?: boolean;
    } = {};

    if (telegramEnabled !== undefined) data.telegramEnabled = telegramEnabled;

    const preference = await prisma.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        telegramEnabled: telegramEnabled ?? true,
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
      },
    };
  });