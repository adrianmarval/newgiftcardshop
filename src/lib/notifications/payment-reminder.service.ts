// ─────────────────────────────────────────────────────────────────────────────
// Payment Reminder — recordatorio de pago pendiente (PAYMENT_REMINDER).
//
// Cubre órdenes del buyer en PENDING (creada, falta confirmar uso + pagar) y
// AWAITING_PAYMENT (uso confirmado, falta reportar el TxID). En ambos estados
// la plataforma ya entregó los códigos y no cobró — el reminder es el nudge
// para que el buyer complete el pago.
//
// Cadencia FIJA cada X minutos (setting payment_reminder_interval_minutes,
// default 60, grupo notifications) mientras la orden siga sin pagar. Reloj
// único desde la creación de la orden: elegible cuando
// coalesce(lastPaymentReminderAt, createdAt) <= now - Xmin.
//
// Multi-instancia seguro: Order.lastPaymentReminderAt ES el claim — el
// updateMany guardado (status + cutoff en el WHERE) garantiza que un solo
// proceso envía (mismo patrón que StockReminderState). Si el dispatch falla,
// el claim se libera (null) y reintenta el próximo ciclo.
//
// Envío via notificationDispatcher (persiste in-app + Telegram via buyer-bot
// + push, respetando telegramEnabled/pushEnabled del buyer).
// ─────────────────────────────────────────────────────────────────────────────

import prisma from '@/lib/prisma';
import { notificationDispatcher } from './dispatcher';
import type { NotificationMessage } from './types';
import { getPaymentReminderIntervalMinutes } from '@/lib/settings/settings.service';
import { formatCurrency } from '@/lib/utils';
import { logger } from '@/lib/logger';

const REMINDER_STATUSES = ['PENDING', 'AWAITING_PAYMENT'] as const;

/**
 * Claim atómico del cooldown por orden: el updateMany guardado es el claim
 * real — count === 1 ⇒ este proceso ganó y debe enviar.
 */
async function claimPaymentReminder(orderId: string, cutoff: Date): Promise<boolean> {
  const claim = await prisma.order.updateMany({
    where: {
      id: orderId,
      status: { in: [...REMINDER_STATUSES] },
      OR: [{ lastPaymentReminderAt: { lte: cutoff } }, { lastPaymentReminderAt: null, createdAt: { lte: cutoff } }],
    },
    data: { lastPaymentReminderAt: new Date() },
  });
  return claim.count === 1;
}

/** Libera el claim para reintentar en el próximo ciclo (5min). */
async function releasePaymentReminderClaim(orderId: string): Promise<void> {
  await prisma.order.update({ where: { id: orderId }, data: { lastPaymentReminderAt: null } }).catch(() => {});
}

/**
 * Sweep de recordatorios de pago pendiente. Corre en un tick de 5min
 * (server.ts). Por cada orden PENDING/AWAITING_PAYMENT cuyo cooldown venció,
 * envía UN reminder al buyer.
 */
export async function sweepPaymentReminders(): Promise<{ sent: number; skipped: number }> {
  const intervalMinutes = await getPaymentReminderIntervalMinutes();
  const cutoff = new Date(Date.now() - intervalMinutes * 60_000);

  // Fast path: solo órdenes elegibles por reloj (el claim re-valida con guard).
  const candidates = await prisma.order.findMany({
    where: {
      status: { in: [...REMINDER_STATUSES] },
      user: { isActive: true },
      OR: [{ lastPaymentReminderAt: { lte: cutoff } }, { lastPaymentReminderAt: null, createdAt: { lte: cutoff } }],
    },
    select: { id: true, userId: true, status: true, total: true, adjustedTotal: true },
  });

  let sent = 0;
  let skipped = 0;

  for (const order of candidates) {
    const claimed = await claimPaymentReminder(order.id, cutoff);
    if (!claimed) {
      skipped++;
      continue;
    }

    try {
      const amount = order.status === 'AWAITING_PAYMENT' ? (order.adjustedTotal ?? order.total) : order.total;
      const shortId = order.id.slice(-8);

      const message: NotificationMessage = {
        type: 'PAYMENT_REMINDER',
        title: '💳 Pago pendiente',
        description: `Tienes una orden pendiente de pago por ${formatCurrency(amount.toNumber())} — Orden #${shortId}`,
        actionUrl: '/store/dashboard/orders',
        metadata: {
          orderId: order.id,
          orderStatus: order.status,
          amount: amount.toString(),
          reminder: true,
        },
      };

      await notificationDispatcher.dispatch(order.userId, message);
      sent++;
    } catch (err) {
      logger.error(`[PaymentReminder] Error enviando reminder (orden ${order.id}):`, {
        error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : String(err) },
      });
      await releasePaymentReminderClaim(order.id);
    }
  }

  return { sent, skipped };
}
