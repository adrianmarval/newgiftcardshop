import prisma from '@/lib/prisma';
import type { NotificationChannelResult, NotificationContext, NotificationMessage } from './types';
import { TelegramChannel } from './channels/telegram.channel';
import { WebPushChannel } from './channels/webpush.channel';
import { publishToUser } from '@/lib/realtime/bus';
import { Prisma, type NotificationType } from '@/generated/prisma/client';
import { logger } from '@/lib/logger';

// Tipos de alerta de stock: in-app queda instantáneo siempre; Telegram/Push
// solo si el buyer activó las alertas de stock (stockAlertsEnabled).
const STOCK_ALERT_TYPES: ReadonlySet<NotificationType> = new Set(['STOCK_AVAILABLE', 'TIER_DROP_ACCESS']);

// El upsert de Prisma NO es atómico (SELECT + INSERT/UPDATE dentro de una tx):
// dos dispatches concurrentes para el mismo usuario (payout + sync cron,
// stock sweep + tier drop, etc.) pueden ambos no encontrar la fila y ambos
// INSERT → el segundo recibe P2002. Al reintentar, la fila ya existe (la creó
// el dispatch competidor) y el retry siempre resuelve como update.
const MAX_UPSERT_ATTEMPTS = 3;

async function upsertPreference(userId: string) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.notificationPreference.upsert({
        where: { userId },
        update: {},
        create: { userId },
        include: { subscriptions: true },
      });
    } catch (err) {
      const isUniqueRace = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
      if (!isUniqueRace || attempt >= MAX_UPSERT_ATTEMPTS) throw err;
    }
  }
}

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
      // Invalidación realtime: la campana/lista in-app se actualiza en <1s.
      // Aplica a TODOS los tipos (la vista in-app es siempre instantánea).
      publishToUser(userId, ['notifications']);
    } catch (err) {
      logger.error(`[Notifications] Error persistiendo Notification (web):`, { error: { name: 'NotificationPersistError', message: String(err) } });
    }

    const preference = await upsertPreference(userId);

    // Alertas de stock (STOCK_AVAILABLE, TIER_DROP_ACCESS): in-app queda
    // instantáneo (persistido arriba). Telegram/Push solo con alertas ON.
    if (STOCK_ALERT_TYPES.has(message.type) && !preference.stockAlertsEnabled) {
      return;
    }

    if (preference.telegramEnabled) {
      const result = await TelegramChannel.send(ctx, message).catch((err): NotificationChannelResult => ({
        status: 'failed',
        error: err?.message || String(err),
      }));

      if (result.status === 'failed') {
        logger.warn(`[Notifications] Telegram falló para user ${userId}: ${result.error}`);
      } else if (result.status === 'skipped') {
        logger.info(`[Notifications] Telegram omitido para user ${userId}: ${result.reason}`);
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
