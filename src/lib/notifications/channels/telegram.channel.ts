import type { NotificationChannel, NotificationChannelResult, NotificationContext, NotificationMessage } from '../types';
import { BotRegistry } from '../bot-registry';
import { escapeHTML, truncateForTelegram } from '@/lib/utils/html';
import prisma from '@/lib/prisma';

function buildTelegramText(message: NotificationMessage): string {
  const title = escapeHTML(message.title);
  const description = escapeHTML(message.description);
  return truncateForTelegram(`<b>${title}</b>\n\n${description}`);
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
      select: { telegramId: true },
    });

    if (!telegramUser) {
      return { status: 'skipped', reason: 'telegram_not_linked' };
    }

    const text = buildTelegramText(message);

    try {
      await bot.api.sendMessage(Number(telegramUser.telegramId), text, {
        parse_mode: 'HTML',
      });
      return { status: 'sent' };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);

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
    }
  },
};
