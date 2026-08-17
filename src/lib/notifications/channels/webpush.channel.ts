import webpush from 'web-push';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { NotificationChannel, NotificationChannelResult, NotificationContext, NotificationMessage } from '../types';

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:support@giftcardshop.app',
    publicKey,
    privateKey,
  );
  vapidConfigured = true;
  return true;
}

export const WebPushChannel: NotificationChannel = {
  name: 'webpush',

  async send(ctx: NotificationContext, message: NotificationMessage): Promise<NotificationChannelResult> {
    if (!ensureVapidConfigured()) {
      logger.info(`[Notifications] WebPush omitido para user ${ctx.userId}: vapid_not_configured`, { userId: ctx.userId });
      return { status: 'skipped', reason: 'vapid_not_configured' };
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: ctx.userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });

    if (subscriptions.length === 0) {
      logger.info(`[Notifications] WebPush omitido para user ${ctx.userId}: no_push_subscriptions`, { userId: ctx.userId });
      return { status: 'skipped', reason: 'no_push_subscriptions' };
    }

    const payload = JSON.stringify({
      title: message.title,
      description: message.description,
      actionUrl: message.actionUrl ?? '/',
      tag: message.type,
    });

    const staleIds: string[] = [];
    const errors: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          // 404/410: el endpoint ya no existe o el usuario revocó el permiso → limpiar
          if (statusCode === 404 || statusCode === 410) {
            staleIds.push(sub.id);
          } else {
            errors.push(err instanceof Error ? err.message : String(err));
          }
        }
      }),
    );

    if (staleIds.length > 0) {
      await prisma.pushSubscription
        .deleteMany({ where: { id: { in: staleIds } } })
        .catch(() => {});
    }

    if (errors.length > 0 && staleIds.length + errors.length === subscriptions.length) {
      return { status: 'failed', error: errors[0] };
    }

    logger.info(`[Notifications] WebPush enviado a user ${ctx.userId}`, {
      userId: ctx.userId,
      metadata: { subscriptions: subscriptions.length, staleRemoved: staleIds.length, failed: errors.length },
    });

    return { status: 'sent' };
  },
};
