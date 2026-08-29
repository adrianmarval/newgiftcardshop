// ─────────────────────────────────────────────────────────────────────────────
// Stock Digest — anti-saturación de STOCK_AVAILABLE en canales interruptivos.
//
// In-app sigue instantáneo (el dispatcher persiste antes de encolar). Telegram
// y Push NO se envían al publicar cada lote: se acumulan en StockDigestQueue y
// el sweep (server.ts, cada 5min) envía UN resumen por (buyer, brandCountry)
// cuando vence la ventana de la marca:
//   BrandCountry.stockDigestIntervalMinutes ?? setting global (default 30min)
//
// La ventana es FIJA desde el primer evento (firstEventAt no se toca en los
// increments): como máximo 1 mensaje por marca cada X minutos.
// ─────────────────────────────────────────────────────────────────────────────

import { Decimal } from '@prisma/client/runtime/client';
import prisma from '@/lib/prisma';
import { TelegramChannel } from './channels/telegram.channel';
import { WebPushChannel } from './channels/webpush.channel';
import type { NotificationContext, NotificationMessage } from './types';
import { getStockDigestIntervalMinutes } from '@/lib/settings/settings.service';
import { getCountryFlag } from '@/lib/utils/country-flags';
import { logger } from '@/lib/logger';

/** Acumula un evento de stock para el resumen. Idempotente por (user, brandCountry). */
export async function enqueueStockDigest(userId: string, brandCountryId: string): Promise<void> {
  await prisma.stockDigestQueue.upsert({
    where: { userId_brandCountryId: { userId, brandCountryId } },
    create: { userId, brandCountryId },
    update: { eventCount: { increment: 1 } }, // firstEventAt se preserva — ventana fija
  });
}

interface DigestBrandCountry {
  stockDigestIntervalMinutes: number | null;
  brand: { name: string };
  country: { name: string; code: string };
}

/**
 * Envía el resumen por los canales activos del buyer.
 * Retorna true si al menos un canal lo entregó. Los descartes (canal off,
 * unsubscribe, sin tasa, stock agotado) retornan false y se borran en silencio.
 */
async function sendStockDigest(userId: string, brandCountryId: string, bc: DigestBrandCountry, eventCount: number): Promise<boolean> {
  const [user, preference, rate] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    prisma.notificationPreference.findUnique({
      where: { userId },
      select: { telegramEnabled: true, pushEnabled: true, subscriptions: { select: { brandCountryId: true } } },
    }),
    prisma.userBrandCountryRate.findFirst({ where: { userId, brandCountryId }, select: { buyRate: true } }),
  ]);

  // Sin user o sin tasa asignada → ya no es elegible
  if (!user || !rate) return false;

  const telegramOn = preference?.telegramEnabled ?? true;
  const pushOn = preference?.pushEnabled ?? false;
  if (!telegramOn && !pushOn) return false;

  // Filtro de marcas: con suscripciones explícitas, solo esas reciben
  const subs = preference?.subscriptions ?? [];
  if (subs.length > 0 && !subs.some((s) => s.brandCountryId === brandCountryId)) return false;

  const buyerBuyRate = Math.floor(rate.buyRate.toNumber() * 100);

  // Stock accesible REAL al momento de enviar — si se agotó, avisar es ruido
  const cards = await prisma.giftcard.findMany({
    where: { brandCountryId, inStock: true, status: 'UNUSED', escalationTier: { lte: buyerBuyRate } },
    select: { amount: true },
  });
  if (cards.length === 0) return false;

  const total = cards.reduce((acc, c) => acc.add(c.amount), new Decimal(0));
  const flag = getCountryFlag(bc.country.code);
  const batchesText = eventCount > 1 ? `${eventCount} lotes nuevos` : 'Nuevo lote';

  const message: NotificationMessage = {
    type: 'STOCK_AVAILABLE',
    title: `${flag} ${bc.brand.name} • ${bc.country.name}`,
    description: `${batchesText} — ${cards.length} tarjetas por $${total.toFixed(2)} accesibles a tu tasa`,
    actionUrl: '/store/dashboard/browse-cards',
    metadata: {
      brandCountryId,
      digest: true,
      batchCount: eventCount,
      accessibleAmount: total.toString(),
      accessibleCardCount: cards.length,
    },
  };

  const ctx: NotificationContext = { userId, userRole: user.role };
  let delivered = false;

  if (telegramOn) {
    const result = await TelegramChannel.send(ctx, message).catch((err) => ({ status: 'failed' as const, error: String(err) }));
    if (result.status === 'sent') delivered = true;
    else if (result.status === 'failed') logger.warn(`[StockDigest] Telegram falló para user ${userId}: ${result.error}`);
  }

  if (pushOn) {
    const result = await WebPushChannel.send(ctx, message).catch((err) => ({ status: 'failed' as const, error: String(err) }));
    if (result.status === 'sent') delivered = true;
    else if (result.status === 'failed') logger.warn(`[StockDigest] WebPush falló para user ${userId}: ${result.error}`);
  }

  return delivered;
}

/**
 * Flush de resúmenes vencidos. Claim atómico por fila (multi-instancia seguro,
 * mismo patrón que telegram-topics). Si el envío lanza, se libera el claim
 * para reintentar en el próximo ciclo.
 */
export async function sweepStockDigests(): Promise<{ sent: number; skipped: number }> {
  const globalInterval = await getStockDigestIntervalMinutes();
  const now = Date.now();

  const pending = await prisma.stockDigestQueue.findMany({
    where: { claimedAt: null },
    include: {
      brandCountry: {
        select: {
          stockDigestIntervalMinutes: true,
          brand: { select: { name: true } },
          country: { select: { name: true, code: true } },
        },
      },
    },
  });

  const due = pending.filter((row) => {
    const interval = row.brandCountry.stockDigestIntervalMinutes ?? globalInterval;
    return row.firstEventAt.getTime() + interval * 60_000 <= now;
  });

  let sent = 0;
  let skipped = 0;

  for (const row of due) {
    const claim = await prisma.stockDigestQueue.updateMany({
      where: { id: row.id, claimedAt: null },
      data: { claimedAt: new Date() },
    });
    if (claim.count === 0) continue; // otra instancia la tomó

    try {
      const delivered = await sendStockDigest(row.userId, row.brandCountryId, row.brandCountry, row.eventCount);
      if (delivered) sent++;
      else skipped++;
      await prisma.stockDigestQueue.delete({ where: { id: row.id } });
    } catch (err) {
      logger.error(`[StockDigest] Error enviando resumen (user ${row.userId}, bc ${row.brandCountryId}):`, {
        error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : String(err) },
      });
      // Liberar el claim para reintento en el próximo ciclo
      await prisma.stockDigestQueue.update({ where: { id: row.id }, data: { claimedAt: null } }).catch(() => {});
    }
  }

  return { sent, skipped };
}
