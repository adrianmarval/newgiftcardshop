// ─────────────────────────────────────────────────────────────────────────────
// Pending Order Alert — alerta al admin por órdenes sin confirmar
// (PENDING_ORDER_ALERT).
//
// Una orden en PENDING ya entregó los códigos al buyer pero este aún no
// confirmó el uso (ni pagó). Si ese estado supera X minutos
// (setting pending_order_alert_minutes, default 60, grupo adminAlerts), el
// admin recibe UNA alerta por orden — one-shot: el admin ya quedó avisado,
// repetir sería ruido (a diferencia del PAYMENT_REMINDER al buyer, que
// insiste hasta que pague).
//
// Multi-instancia seguro: Order.lastPendingOrderAlertAt ES el claim — el
// updateMany guardado (status PENDING + claim null + cutoff en el WHERE)
// garantiza que un solo proceso envía. Si el dispatch falla, el claim se
// libera (null) y reintenta el próximo ciclo. One-shot: si el dispatch
// tiene éxito, la orden jamás vuelve a ser candidata.
//
// No hay trigger al transicionar la orden: si el buyer confirma antes del
// umbral, la orden deja de ser candidata sola (status en el guard).
//
// Envío via notificationDispatcher (persiste in-app + Telegram via buyer-bot
// — el rol ADMIN va por ese bot — + push, respetando telegramEnabled/
// pushEnabled del admin).
// ─────────────────────────────────────────────────────────────────────────────

import prisma from '@/lib/prisma';
import { notificationDispatcher } from './dispatcher';
import type { NotificationMessage } from './types';
import { getPendingOrderAlertMinutes } from '@/lib/settings/settings.service';
import { formatCurrency } from '@/lib/utils';
import { logger } from '@/lib/logger';

/**
 * Claim atómico one-shot por orden: el updateMany guardado es el claim
 * real — count === 1 ⇒ este proceso ganó y debe enviar.
 */
async function claimPendingOrderAlert(orderId: string, cutoff: Date): Promise<boolean> {
  const claim = await prisma.order.updateMany({
    where: {
      id: orderId,
      status: 'PENDING',
      lastPendingOrderAlertAt: null,
      createdAt: { lte: cutoff },
    },
    data: { lastPendingOrderAlertAt: new Date() },
  });
  return claim.count === 1;
}

/** Libera el claim para reintentar en el próximo ciclo (5min). */
async function releasePendingOrderAlertClaim(orderId: string): Promise<void> {
  await prisma.order.update({ where: { id: orderId }, data: { lastPendingOrderAlertAt: null } }).catch(() => {});
}

/**
 * Sweep de alertas al admin por órdenes trabadas en PENDING. Corre en un
 * tick de 5min (server.ts). Por cada orden PENDING que supera el umbral
 * configurado y aún no fue alertada, envía UNA alerta al admin.
 */
export async function sweepPendingOrderAlerts(): Promise<{ sent: number; skipped: number }> {
  const thresholdMinutes = await getPendingOrderAlertMinutes();
  const cutoff = new Date(Date.now() - thresholdMinutes * 60_000);

  // Fast path: solo órdenes elegibles por antigüedad y no alertadas (el
  // claim re-valida con guard).
  const candidates = await prisma.order.findMany({
    where: {
      status: 'PENDING',
      lastPendingOrderAlertAt: null,
      createdAt: { lte: cutoff },
    },
    select: {
      id: true,
      userId: true,
      total: true,
      createdAt: true,
      user: { select: { email: true } },
    },
  });

  if (candidates.length === 0) {
    return { sent: 0, skipped: 0 };
  }

  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  if (!admin) {
    logger.warn('[PendingOrderAlert] No hay usuario ADMIN — sweep descartado', {
      metadata: { candidates: candidates.length },
    });
    return { sent: 0, skipped: candidates.length };
  }

  let sent = 0;
  let skipped = 0;

  for (const order of candidates) {
    const claimed = await claimPendingOrderAlert(order.id, cutoff);
    if (!claimed) {
      skipped++;
      continue;
    }

    try {
      const shortId = order.id.slice(-8);
      const ageMinutes = Math.floor((Date.now() - order.createdAt.getTime()) / 60_000);

      const message: NotificationMessage = {
        type: 'PENDING_ORDER_ALERT',
        title: '⏳ Orden sin confirmar',
        description: `El buyer ${order.user.email} lleva ${ageMinutes} min sin confirmar la orden #${shortId} por ${formatCurrency(order.total.toNumber())} — los códigos ya fueron entregados.`,
        actionUrl: `/admin/dashboard/orders?search=${shortId}`,
        metadata: {
          orderId: order.id,
          buyerId: order.userId,
          buyerEmail: order.user.email,
          amount: order.total.toString(),
          ageMinutes,
        },
      };

      await notificationDispatcher.dispatch(admin.id, message);
      sent++;
    } catch (err) {
      logger.error(`[PendingOrderAlert] Error enviando alerta (orden ${order.id}):`, {
        error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : String(err) },
      });
      await releasePendingOrderAlertClaim(order.id);
    }
  }

  return { sent, skipped };
}
