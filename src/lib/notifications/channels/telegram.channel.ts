import type { Api } from 'grammy';
import type { NotificationChannel, NotificationChannelResult, NotificationContext, NotificationMessage } from '../types';
import { BotRegistry } from '../bot-registry';
import {
  NOTIFICATIONS_TOPIC_NAME,
  getOrCreateTopicId,
  isTopicGoneError,
  tryReopenTopic,
  resetNotificationTopicId,
} from '../telegram-topics';
import { escapeHTML, truncateForTelegram } from '@/lib/utils/html';
import prisma from '@/lib/prisma';

// Feature flag: notificaciones dentro del topic "🔔 Notificaciones" del chat
// privado (forum topic mode, Bot API 10.x). Requiere habilitar topic mode en
// @BotFather para cada bot. Si está apagado o falla, se envía mensaje plano.
const TOPIC_NOTIFICATIONS_ENABLED = process.env.NOTIFICATIONS_TOPIC_ENABLED === 'true';

function buildTelegramText(message: NotificationMessage): string {
  const title = escapeHTML(message.title);
  const description = escapeHTML(message.description);
  return truncateForTelegram(`<b>${title}</b>\n\n${description}`);
}

async function deliver(api: Api, chatId: number, text: string, topicId: number | null): Promise<void> {
  await api.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    ...(topicId != null ? { message_thread_id: topicId } : {}),
  });
}

export const TelegramChannel: NotificationChannel = {
  name: 'telegram',

  async send(ctx: NotificationContext, message: NotificationMessage): Promise<NotificationChannelResult> {
    const bot = ctx.userRole === 'BUYER' || ctx.userRole === 'ADMIN' ? BotRegistry.getBuyerBot() : BotRegistry.getSellerBot();

    if (!bot) {
      return { status: 'skipped', reason: 'bot_not_initialized' };
    }

    const telegramUser = await prisma.telegramUser.findUnique({
      where: { userId: ctx.userId },
      select: { telegramId: true, notificationTopicId: true, notificationChatId: true },
    });

    if (!telegramUser) {
      return { status: 'skipped', reason: 'telegram_not_linked' };
    }

    const text = buildTelegramText(message);
    const chatId = Number(telegramUser.telegramId);

    let topicId: number | null = null;
    if (TOPIC_NOTIFICATIONS_ENABLED) {
      topicId = await getOrCreateTopicId({
        api: bot.api,
        chatId,
        name: NOTIFICATIONS_TOPIC_NAME,
        field: 'notificationTopicId',
        userId: ctx.userId,
        storedTopicId: telegramUser.notificationTopicId,
        storedChatId: telegramUser.notificationChatId,
      });
    }

    // Hasta 3 intentos:
    // 1. con topic — si el usuario lo borró/cerró, se recrea (o reabre) y se reintenta
    // 2. con el topic recreado — si aún falla, último intento como mensaje plano
    // 3. plano (General) — nunca perder una notificación por culpa del topic
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await deliver(bot.api, chatId, text, topicId);
        return { status: 'sent' };
      } catch (err: unknown) {
        lastError = err;
        const errorMessage = err instanceof Error ? err.message : String(err);

        if (topicId != null && attempt < 2 && isTopicGoneError(errorMessage)) {
          if (attempt === 0) {
            // Topic cerrado → intentar reabrir conservando el historial
            const reopened = await tryReopenTopic(bot.api, chatId, topicId);
            if (reopened) continue;

            // Topic borrado (o reopen falló) → limpiar y recrear
            await resetNotificationTopicId(ctx.userId);
            topicId = await getOrCreateTopicId({
              api: bot.api,
              chatId,
              name: NOTIFICATIONS_TOPIC_NAME,
              field: 'notificationTopicId',
              userId: ctx.userId,
              storedTopicId: null,
              storedChatId: null,
            });
            continue;
          }
          // El topic recreado también falló → fallback a mensaje plano
          topicId = null;
          continue;
        }

        break;
      }
    }

    const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);

    if (errorMessage.includes('bot was blocked by the user') || errorMessage.includes('Forbidden: bot was blocked')) {
      await prisma.notificationPreference
        .update({
          where: { userId: ctx.userId },
          data: { telegramEnabled: false },
        })
        .catch(() => {});
      return { status: 'failed', error: 'bot_blocked_by_user' };
    }

    return { status: 'failed', error: errorMessage };
  },
};
