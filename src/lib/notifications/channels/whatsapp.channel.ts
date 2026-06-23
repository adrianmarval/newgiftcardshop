import type { NotificationChannel, NotificationChannelResult, NotificationContext, NotificationMessage } from '../types';
import { getWhatsAppSocket, isWhatsAppConnected } from '@/lib/whatsapp';
import prisma from '@/lib/prisma';

function formatWhatsAppJid(phone: string): string {
  return phone.replace(/^\+/, '') + '@s.whatsapp.net';
}

function buildWhatsAppText(message: NotificationMessage): string {
  return `*${message.title}*\n\n${message.description}`;
}

export const WhatsAppChannel: NotificationChannel = {
  name: 'whatsapp',

  async send(ctx: NotificationContext, message: NotificationMessage): Promise<NotificationChannelResult> {
    if (!isWhatsAppConnected()) {
      return { status: 'skipped', reason: 'socket_not_connected' };
    }

    const preference = await prisma.notificationPreference.findUnique({
      where: { userId: ctx.userId },
      select: { whatsappPhone: true },
    });

    if (!preference?.whatsappPhone) {
      return { status: 'skipped', reason: 'no_whatsapp_phone' };
    }

    const sock = getWhatsAppSocket();
    if (!sock) return { status: 'skipped', reason: 'socket_not_available' };

    const jid = formatWhatsAppJid(preference.whatsappPhone);
    const text = buildWhatsAppText(message);

    try {
      await sock.sendMessage(jid, { text });
      return { status: 'sent' };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (errorMessage.includes('blocked') || errorMessage.includes('not registered')) {
        await prisma.notificationPreference
          .update({
            where: { userId: ctx.userId },
            data: { whatsappEnabled: false },
          })
          .catch(() => {});
        return { status: 'failed', error: 'user_blocked_or_not_registered' };
      }

      return { status: 'failed', error: errorMessage };
    }
  },
};