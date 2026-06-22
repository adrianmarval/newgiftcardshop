import prisma from '@/lib/prisma';
import type { NotificationChannelResult, NotificationContext, NotificationMessage } from './types';
import { TelegramChannel } from './channels/telegram.channel';
import { WhatsAppChannel } from './channels/whatsapp.channel';
import { WebChannel } from './channels/web.channel';
import type { Role } from '@/generated/prisma/client';
import type { Prisma } from '@/generated/prisma/client';

function roleToUserRole(role: Role): 'BUYER' | 'SELLER' | 'ADMIN' {
  return role as 'BUYER' | 'SELLER' | 'ADMIN';
}

export class NotificationDispatcher {
  async dispatch(userId: string, message: NotificationMessage): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      console.warn(`[Notifications] Usuario ${userId} no encontrado, se omite dispatch`);
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
      userRole: roleToUserRole(user.role),
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
      console.error(`[Notifications] Error persistiendo Notification (web):`, err);
    }

    WebChannel.send(ctx, message).catch((err) => {
      console.error(`[Notifications] Web channel error (inesperado):`, err);
    });

    if (preference.telegramEnabled) {
      const result = await TelegramChannel.send(ctx, message).catch((err): NotificationChannelResult => ({
        status: 'failed',
        error: err?.message || String(err),
      }));

      if (result.status === 'failed') {
        console.warn(`[Notifications] Telegram falló para user ${userId}: ${result.error}`);
      }
    }

    if (preference.whatsappEnabled && preference.whatsappPhone) {
      const result = await WhatsAppChannel.send(ctx, message).catch((err): NotificationChannelResult => ({
        status: 'failed',
        error: err?.message || String(err),
      }));

      if (result.status === 'failed') {
        console.warn(`[Notifications] WhatsApp falló para user ${userId}: ${result.error}`);
      }
    }
  }

  async dispatchMany(userIds: string[], message: NotificationMessage): Promise<void> {
    await Promise.all(userIds.map((id) => this.dispatch(id, message).catch((err) => {
      console.error(`[Notifications] Error en dispatchMany para user ${id}:`, err);
    })));
  }
}

export const notificationDispatcher = new NotificationDispatcher();
