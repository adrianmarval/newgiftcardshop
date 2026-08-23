import prisma from '@/lib/prisma';
import type { NotificationChannelResult, NotificationContext, NotificationMessage } from './types';
import { TelegramChannel } from './channels/telegram.channel';
import { WebPushChannel } from './channels/webpush.channel';
import type { Prisma } from '@/generated/prisma/client';
import { logger } from '@/lib/logger';

export class NotificationDispatcher {
  async dispatch(userId: string, message: NotificationMessage): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      logger.warn(`[Notifications] Usuario ${userId} no encontrado, se omite dispatch`);
      return;
    }

    const preference = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: { subscriptions: true },
    });

    const ctx: NotificationContext = {
      userId,
      userRole: user.role,
    };

    try {
      await prisma.notification.create({
        data: {
          userId,
          type: message.type,
          title: message.title,
          description: message.description,
          actionUrl: message.actionUrl ?? null,
          metadata: (message.metadata ?? null) as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      logger.error(`[Notifications] Error persistiendo Notification (web):`, { error: { name: 'NotificationPersistError', message: String(err) } });
    }

    if (preference.telegramEnabled) {
      const result = await TelegramChannel.send(ctx, message).catch((err): NotificationChannelResult => ({
        status: 'failed',
        error: err?.message || String(err),
      }));

      if (result.status === 'failed') {
        logger.warn(`[Notifications] Telegram falló para user ${userId}: ${result.error}`);
      }
    }

    if (preference.pushEnabled) {
      const result = await WebPushChannel.send(ctx, message).catch((err): NotificationChannelResult => ({
        status: 'failed',
        error: err?.message || String(err),
      }));

      if (result.status === 'failed') {
        logger.warn(`[Notifications] WebPush falló para user ${userId}: ${result.error}`);
      }
    }
  }

  async dispatchMany(userIds: string[], message: NotificationMessage): Promise<void> {
    await Promise.all(userIds.map((id) => this.dispatch(id, message).catch((err) => {
      logger.error(`[Notifications] Error en dispatchMany para user ${id}:`, { error: { name: 'DispatchManyError', message: String(err) } });
    })));
  }
}

export const notificationDispatcher = new NotificationDispatcher();
