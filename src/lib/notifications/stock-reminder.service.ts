// ─────────────────────────────────────────────────────────────────────────────
// Stock Reminder — recordatorio de stock VARADO (STOCK_REMINDER).
//
// Cubre stock que nadie compró. Semántica de UN solo knob
// por marca (BrandCountry.stockReminderIntervalMinutes ?? setting global,
// default 60min): si TODO el stock accesible del buyer en la marca es más viejo
// que el intervalo, recibe UN recordatorio.
//
// Anti-ruido: si el buyer tiene CUALQUIER tarjeta accesible más nueva que el
// intervalo, se skipea — ese buyer ya fue nudgeado por el flujo normal
// (STOCK_AVAILABLE in-app instantáneo + Telegram/Push si tiene activadas las
// alertas de stock). El reminder solo dispara cuando el stock accesible está
// completamente quieto.
//
// Anti-spam (2 capas complementarias):
// 1. Fingerprint de novedad ("count:total:newestISO"): exactamente las variables
//    del mensaje + la fecha de la card más nueva (detecta cambios de composición
//    con mismo count/total). Contenido nuevo → cooldown base.
// 2. Cadencia escalonada: contenido IDÉNTICO exige cooldown base × [1,6,24]
//    (tope ×24) según consecutiveIdentical. Con base 60min: 1er re-envío
//    idéntico a las 6h, siguientes cada 24h. El cooldown escalonado es también
//    el limitador de frecuencia ante fingerprints oscilantes (mercado activo).
// Al cerrarse un ciclo de estancamiento (stock fresco o sin stock accesible)
// el dedup se resetea: el próximo estancamiento arranca con cadencia fresca.
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
 * Escalera de cooldown para reminders IDÉNTICOS: multiplicadores del intervalo
 * base, indexados por consecutiveIdentical (cap en el último valor).
 * El índice 0 (=1) es el cooldown base para contenido nuevo.
 */
const REMINDER_ESCALATION_MULTIPLIERS = [1, 6, 24] as const;

/**
 * Garantiza la fila de estado (lastSentAt en epoch si es nueva — un buyer que
 * nunca recibió reminder es elegible de inmediato) y la lee para el dedup.
 */
async function ensureReminderState(userId: string, brandCountryId: string) {
  await prisma.stockReminderState
    .upsert({
      where: { userId_brandCountryId: { userId, brandCountryId } },
      create: { userId, brandCountryId, lastSentAt: new Date(0) },
      update: {},
    })
    .catch(() => {}); // P2002 bajo carrera de upsert — el updateMany del claim es el real

  return prisma.stockReminderState.findUnique({
    where: { userId_brandCountryId: { userId, brandCountryId } },
    select: { lastFingerprint: true, consecutiveIdentical: true },
  });
}

/**
 * Claim atómico del cooldown (multi-instancia seguro, mismo patrón que telegram-topics):
 * el updateMany guardado es el claim real. count===1 ⇒ este proceso ganó.
 */
async function claimReminderCooldown(userId: string, brandCountryId: string, cooldownCutoff: Date): Promise<boolean> {
  const claim = await prisma.stockReminderState.updateMany({
    where: { userId, brandCountryId, lastSentAt: { lte: cooldownCutoff } },
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
 * Resetea el dedup al cerrarse un ciclo de estancamiento (llegó stock fresco o
 * no queda stock accesible): el próximo estancamiento vuelve a notificar con
 * cadencia fresca. La guarda `lastFingerprint: not null` evita escrituras en
 * cada tick mientras no hay nada que resetear.
 */
async function resetReminderCycle(userId: string, brandCountryId: string): Promise<void> {
  await prisma.stockReminderState
    .updateMany({
      where: { userId, brandCountryId, lastFingerprint: { not: null } },
      data: { lastFingerprint: null, consecutiveIdentical: 0 },
    })
    .catch(() => {});
}

/**
 * Sweep de recordatorios de stock varado. Corre en un tick de 5min
 * (server.ts). Por cada (buyer, brandCountry) con TODO su stock
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

      // floor sobre el Decimal (toNumber() primero = float artifact: 0.57 → 56)
      const buyerBuyRate = rate.buyRate.times(100).floor().toNumber();

      const accessible = await prisma.giftcard.aggregate({
        where: { brandCountryId: bc.id, inStock: true, status: 'UNUSED', escalationTier: { lte: buyerBuyRate } },
        _count: { _all: true },
        _sum: { amount: true },
        _max: { createdAt: true },
      });

      const cardCount = accessible._count._all;
      const newest = accessible._max.createdAt;

      // Sin stock accesible, o hay stock FRESCO accesible (buyer ya nudgeado
      // por STOCK_AVAILABLE) → no es territorio del reminder. Se resetea el
      // dedup: un nuevo ciclo de estancamiento arranca con cadencia fresca.
      if (cardCount === 0 || !newest || newest > cutoff) {
        await resetReminderCycle(rate.userId, bc.id);
        skipped++;
        continue;
      }

      const total = accessible._sum.amount ?? new Decimal(0);
      const fingerprint = `${cardCount}:${total.toString()}:${newest.toISOString()}`;

      const state = await ensureReminderState(rate.userId, bc.id);
      const identical = state?.lastFingerprint === fingerprint;

      // Contenido idéntico → cooldown escalonado; contenido nuevo → cooldown base
      const multiplier = identical
        ? REMINDER_ESCALATION_MULTIPLIERS[Math.min(state?.consecutiveIdentical ?? 0, REMINDER_ESCALATION_MULTIPLIERS.length - 1)]
        : REMINDER_ESCALATION_MULTIPLIERS[0];
      const cooldownCutoff = new Date(now - interval * multiplier * 60_000);

      const claimed = await claimReminderCooldown(rate.userId, bc.id, cooldownCutoff);
      if (!claimed) {
        skipped++;
        continue;
      }

      try {
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

        // Dedup post-envío: solo el ganador del claim llega acá (sin race).
        await prisma.stockReminderState.update({
          where: { userId_brandCountryId: { userId: rate.userId, brandCountryId: bc.id } },
          data: {
            lastFingerprint: fingerprint,
            consecutiveIdentical: identical ? (state?.consecutiveIdentical ?? 0) + 1 : 1,
          },
        });
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
