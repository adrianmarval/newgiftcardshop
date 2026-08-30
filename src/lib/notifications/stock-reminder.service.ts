// ─────────────────────────────────────────────────────────────────────────────
// Stock Reminder — recordatorio de stock VARADO (STOCK_REMINDER).
//
// Complementa al digest: el digest agrupa llegadas NUEVAS de stock; este sweep
// cubre el caso contrario — stock que nadie compró. Semántica de UN solo knob
// por marca (BrandCountry.stockReminderIntervalMinutes ?? setting global,
// default 60min): si TODO el stock accesible del buyer en la marca es más viejo
// que el intervalo, recibe UN recordatorio (máx 1 por intervalo — el intervalo
// es a la vez el umbral de "varado" y el cooldown).
//
// Anti-ruido: si el buyer tiene CUALQUIER tarjeta accesible más nueva que el
// intervalo, se skipea — ese buyer ya fue nudgeado por el flujo normal
// (STOCK_AVAILABLE in-app instantáneo + digest Telegram/Push). El reminder solo
// dispara cuando el stock accesible está completamente quieto.
//
// Envío via notificationDispatcher (persiste in-app + respeta telegramEnabled/
// pushEnabled). El filtro de suscripciones se aplica AQUÍ (el dispatcher no lo
// aplica — lo hace notification.service antes de dispatchear).
// ─────────────────────────────────────────────────────────────────────────────

import { Decimal } from '@prisma/client/runtime/client';
import prisma from '@/lib/prisma';
import { notificationDispatcher } from './dispatcher';
import type { NotificationMessage } from './types';
import { getStockReminderIntervalMinutes } from '@/lib/settings/settings.service';
import { getCountryFlag } from '@/lib/utils/country-flags';
import { formatCurrency } from '@/lib/utils';
import { logger } from '@/lib/logger';

/**
 * Claim atómico del cooldown (multi-instancia seguro, mismo patrón que el
 * digest): upsert garantiza la fila (lastSentAt en epoch si es nueva — un
 * buyer que nunca recibió reminder es elegible de inmediato) y el updateMany
 * guardado es el claim real. count===1 ⇒ este proceso ganó.
 */
async function claimReminderCooldown(userId: string, brandCountryId: string, cutoff: Date): Promise<boolean> {
  await prisma.stockReminderState
    .upsert({
      where: { userId_brandCountryId: { userId, brandCountryId } },
      create: { userId, brandCountryId, lastSentAt: new Date(0) },
      update: {},
    })
    .catch(() => {}); // P2002 bajo carrera de upsert — el updateMany de abajo es el claim real

  const claim = await prisma.stockReminderState.updateMany({
    where: { userId, brandCountryId, lastSentAt: { lte: cutoff } },
    data: { lastSentAt: new Date() },
  });
  return claim.count === 1;
}

/** Libera el claim para reintentar en el próximo ciclo (5min). */
async function releaseReminderClaim(userId: string, brandCountryId: string): Promise<void> {
  await prisma.stockReminderState
    .update({
      where: { userId_brandCountryId: { userId, brandCountryId } },
      data: { lastSentAt: new Date(0) },
    })
    .catch(() => {});
}

/**
 * Sweep de recordatorios de stock varado. Corre en el mismo tick de 5min que
 * el digest (server.ts). Por cada (buyer, brandCountry) con TODO su stock
 * accesible más viejo que el intervalo y cooldown vencido, envía UN reminder.
 */
export async function sweepStockReminders(): Promise<{ sent: number; skipped: number }> {
  const globalInterval = await getStockReminderIntervalMinutes();
  const now = Date.now();

  const brandCountries = await prisma.brandCountry.findMany({
    where: { isActive: true },
    select: {
      id: true,
      stockReminderIntervalMinutes: true,
      brandId: true,
      countryId: true,
      brand: { select: { name: true } },
      country: { select: { name: true, code: true } },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const bc of brandCountries) {
    const interval = bc.stockReminderIntervalMinutes ?? globalInterval;
    const cutoff = new Date(now - interval * 60_000);

    // Fast path por marca: sin stock viejo, no hay nada que recordar
    const staleStock = await prisma.giftcard.findFirst({
      where: { brandCountryId: bc.id, inStock: true, status: 'UNUSED', createdAt: { lte: cutoff } },
      select: { id: true },
    });
    if (!staleStock) continue;

    const rates = await prisma.userBrandCountryRate.findMany({
      where: { brandCountryId: bc.id, user: { role: 'BUYER', isActive: true } },
      select: {
        userId: true,
        buyRate: true,
        user: {
          select: {
            notificationPreference: { select: { subscriptions: { select: { brandCountryId: true } } } },
          },
        },
      },
    });

    for (const rate of rates) {
      // Filtro de marcas: con suscripciones explícitas, solo esas reciben
      const subs = rate.user.notificationPreference?.subscriptions ?? [];
      if (subs.length > 0 && !subs.some((s) => s.brandCountryId === bc.id)) {
        skipped++;
        continue;
      }

      const buyerBuyRate = Math.floor(rate.buyRate.toNumber() * 100);

      const accessible = await prisma.giftcard.aggregate({
        where: { brandCountryId: bc.id, inStock: true, status: 'UNUSED', escalationTier: { lte: buyerBuyRate } },
        _count: { _all: true },
        _sum: { amount: true },
        _max: { createdAt: true },
      });

      const cardCount = accessible._count._all;
      const newest = accessible._max.createdAt;

      // Sin stock accesible, o hay stock FRESCO accesible (buyer ya nudgeado
      // por STOCK_AVAILABLE/digest) → no es territorio del reminder
      if (cardCount === 0 || !newest || newest > cutoff) {
        skipped++;
        continue;
      }

      const claimed = await claimReminderCooldown(rate.userId, bc.id, cutoff);
      if (!claimed) {
        skipped++;
        continue;
      }

      try {
        const total = accessible._sum.amount ?? new Decimal(0);
        const flag = getCountryFlag(bc.country.code);

        const message: NotificationMessage = {
          type: 'STOCK_REMINDER',
          title: `${flag} ${bc.brand.name} • ${bc.country.name}`,
          description: `${cardCount} tarjetas por ${formatCurrency(total.toNumber())} siguen disponibles a tu tasa`,
          actionUrl: `/store/dashboard/browse-cards?brand=${bc.brandId}&country=${bc.countryId}`,
          metadata: {
            brandCountryId: bc.id,
            reminder: true,
            accessibleAmount: total.toString(),
            accessibleCardCount: cardCount,
          },
        };

        await notificationDispatcher.dispatch(rate.userId, message);
        sent++;
      } catch (err) {
        logger.error(`[StockReminder] Error enviando reminder (user ${rate.userId}, bc ${bc.id}):`, {
          error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : String(err) },
        });
        await releaseReminderClaim(rate.userId, bc.id);
      }
    }
  }

  return { sent, skipped };
}
