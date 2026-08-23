import { Decimal } from '@prisma/client/runtime/client';
import prisma from '@/lib/prisma';
import { notificationDispatcher } from './dispatcher';
import type { NotificationMessage } from './types';
import type { NotificationType } from '@/generated/prisma/client';
import { getCountryFlag } from '@/lib/utils/country-flags';
import type { BrandCountryInfo, EligibleBuyer, TierDropEvent } from '@/types';

interface StockCard {
  amount: Decimal;
  escalationTier: number;
}

// ── Shared helpers ──────────────────────────────────────────────────────────

async function getBrandCountryInfo(brandCountryId: string): Promise<BrandCountryInfo | null> {
  const bc = await prisma.brandCountry.findUnique({
    where: { id: brandCountryId },
    select: {
      brand: { select: { name: true } },
      country: { select: { name: true, code: true } },
    },
  });
  if (!bc) return null;
  return {
    brandName: bc.brand.name,
    countryName: bc.country.name,
    countryCode: bc.country.code,
  };
}

async function getEligibleBuyers(brandCountryId: string): Promise<EligibleBuyer[]> {
  const eligibleRates = await prisma.userBrandCountryRate.findMany({
    where: {
      brandCountryId,
      user: {
        role: 'BUYER',
        isActive: true,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          notificationPreference: {
            select: { subscriptions: { select: { brandCountryId: true } } },
          },
        },
      },
    },
  });

  return eligibleRates.map((rate) => ({
    userId: rate.user.id,
    buyRate: rate.buyRate,
    notificationPreference: rate.user.notificationPreference,
  }));
}

function shouldNotifyBySubscription(preference: EligibleBuyer['notificationPreference'], brandCountryId: string): boolean {
  if (!preference) return true;
  const subs = preference.subscriptions;
  if (subs.length === 0) return true;
  return subs.some((s) => s.brandCountryId === brandCountryId);
}

async function batchHasBeenNotified(
  buyerIds: string[],
  type: NotificationType,
  referenceType: string,
  referenceId: string,
): Promise<Set<string>> {
  if (buyerIds.length === 0) return new Set();

  const existing = await prisma.notificationLog.findMany({
    where: {
      userId: { in: buyerIds },
      type,
      referenceType,
      referenceId,
    },
    select: { userId: true },
  });

  return new Set(existing.map((log) => log.userId));
}

async function getAllStockCards(brandCountryId: string): Promise<StockCard[]> {
  const cards = await prisma.giftcard.findMany({
    where: {
      brandCountryId,
      inStock: true,
      status: 'UNUSED',
    },
    select: { amount: true, escalationTier: true },
  });

  return cards;
}

function computeSummary(allCards: StockCard[], buyerBuyRate: number) {
  let totalAmount = new Decimal(0);
  let cardCount = 0;

  for (const card of allCards) {
    if (card.escalationTier <= buyerBuyRate) {
      totalAmount = totalAmount.add(card.amount);
      cardCount++;
    }
  }

  return { totalAmount, cardCount };
}

async function batchRecordNotificationLogs(
  entries: { userId: string; type: NotificationType; referenceType: string; referenceId: string }[],
): Promise<void> {
  if (entries.length === 0) return;

  await prisma.notificationLog.createMany({
    data: entries,
    skipDuplicates: true,
  });
}

// ── Public functions ────────────────────────────────────────────────────────

export async function notifyBuyersStockAvailable(brandCountryId: string, initialTier: number | null, batchId: number): Promise<void> {
  const info = await getBrandCountryInfo(brandCountryId);
  if (!info) return;

  const effectiveTier = initialTier ?? 85;
  const refId = batchId.toString();

  const [eligibleBuyers, allCards] = await Promise.all([getEligibleBuyers(brandCountryId), getAllStockCards(brandCountryId)]);

  const buyerIds = eligibleBuyers.map((b) => b.userId);
  const alreadyNotified = await batchHasBeenNotified(buyerIds, 'STOCK_AVAILABLE', 'BATCH', refId);

  const entriesToRecord: { userId: string; type: NotificationType; referenceType: string; referenceId: string }[] = [];
  const dispatches: Promise<void>[] = [];

  for (const buyer of eligibleBuyers) {
    const buyerBuyRate = Math.floor(buyer.buyRate.toNumber() * 100);
    if (buyerBuyRate < effectiveTier) continue;
    if (alreadyNotified.has(buyer.userId)) continue;
    if (!shouldNotifyBySubscription(buyer.notificationPreference, brandCountryId)) continue;

    const summary = computeSummary(allCards, buyerBuyRate);
    const flag = getCountryFlag(info.countryCode);
    const stockText =
      summary.cardCount > 0
        ? `${summary.cardCount} tarjetas por $${summary.totalAmount.toFixed(2)} disponibles`
        : `Tier inicial: ${effectiveTier}%`;

    const message: NotificationMessage = {
      type: 'STOCK_AVAILABLE',
      title: `${flag} ${info.brandName} • ${info.countryName}`,
      description: stockText,
      actionUrl: '/store/dashboard/browse-cards',
      metadata: {
        brandName: info.brandName,
        countryName: info.countryName,
        countryCode: info.countryCode,
        initialTier: effectiveTier,
        batchId,
        accessibleAmount: summary.totalAmount.toString(),
        accessibleCardCount: summary.cardCount,
      },
    };

    entriesToRecord.push({ userId: buyer.userId, type: 'STOCK_AVAILABLE', referenceType: 'BATCH', referenceId: refId });
    dispatches.push(notificationDispatcher.dispatch(buyer.userId, message));
  }

  await batchRecordNotificationLogs(entriesToRecord);
  await Promise.all(dispatches);
}

export async function notifyBuyersTierDrop(events: TierDropEvent[]): Promise<void> {
  if (events.length === 0) return;

  const eventsByBrandCountry = new Map<string, TierDropEvent[]>();
  for (const event of events) {
    if (event.newTier >= event.oldTier) continue;
    const group = eventsByBrandCountry.get(event.brandCountryId) ?? [];
    group.push(event);
    eventsByBrandCountry.set(event.brandCountryId, group);
  }

  const brandCountryInfoCache = new Map<string, BrandCountryInfo | null>();

  for (const [brandCountryId, groupEvents] of eventsByBrandCountry) {
    let info = brandCountryInfoCache.get(brandCountryId);
    if (info === undefined) {
      info = await getBrandCountryInfo(brandCountryId);
      brandCountryInfoCache.set(brandCountryId, info);
    }
    if (!info) continue;

    const [eligibleBuyers, allCards] = await Promise.all([getEligibleBuyers(brandCountryId), getAllStockCards(brandCountryId)]);

    const notifiedBuyers = new Set<string>();

    for (const event of groupEvents) {
      const buyersInCrossover = eligibleBuyers.filter((buyer) => {
        const buyerBuyRate = Math.floor(buyer.buyRate.toNumber() * 100);
        return buyerBuyRate >= event.newTier && buyerBuyRate < event.oldTier;
      });

      const buyerIds = buyersInCrossover.map((b) => b.userId).filter((id) => !notifiedBuyers.has(id));
      const alreadyNotified = await batchHasBeenNotified(buyerIds, 'TIER_DROP_ACCESS', 'GIFTCARD', event.giftcardId);

      const entriesToRecord: { userId: string; type: NotificationType; referenceType: string; referenceId: string }[] = [];
      const dispatches: Promise<void>[] = [];

      for (const buyer of buyersInCrossover) {
        if (notifiedBuyers.has(buyer.userId)) continue;
        if (alreadyNotified.has(buyer.userId)) continue;
        if (!shouldNotifyBySubscription(buyer.notificationPreference, brandCountryId)) continue;

        const buyerBuyRate = Math.floor(buyer.buyRate.toNumber() * 100);
        const summary = computeSummary(allCards, buyerBuyRate);
        const flag = getCountryFlag(info.countryCode);
        const stockText =
          summary.cardCount > 0
            ? `${summary.cardCount} tarjetas por $${summary.totalAmount.toFixed(2)} disponibles`
            : `Tier bajó de ${event.oldTier}% a ${event.newTier}%`;

        const message: NotificationMessage = {
          type: 'TIER_DROP_ACCESS',
          title: `${flag} ${info.brandName} • ${info.countryName}`,
          description: stockText,
          actionUrl: '/store/dashboard/browse-cards',
          metadata: {
            brandName: info.brandName,
            countryName: info.countryName,
            countryCode: info.countryCode,
            oldTier: event.oldTier,
            newTier: event.newTier,
            giftcardId: event.giftcardId,
            accessibleAmount: summary.totalAmount.toString(),
            accessibleCardCount: summary.cardCount,
          },
        };

        notifiedBuyers.add(buyer.userId);

        for (const ev of groupEvents) {
          const rate = Math.floor(buyer.buyRate.toNumber() * 100);
          if (rate >= ev.newTier && rate < ev.oldTier) {
            entriesToRecord.push({ userId: buyer.userId, type: 'TIER_DROP_ACCESS', referenceType: 'GIFTCARD', referenceId: ev.giftcardId });
          }
        }

        dispatches.push(notificationDispatcher.dispatch(buyer.userId, message));
      }

      await batchRecordNotificationLogs(entriesToRecord);
      await Promise.all(dispatches);
    }
  }
}

export async function notifySellerBatchPaid(sellerId: string, batchId: number, amount: number): Promise<void> {
  const message: NotificationMessage = {
    type: 'BATCH_PAID',
    title: `Batch #${batchId} paid`,
    description: `${amount.toFixed(2)} USDT transferred to your account`,
    actionUrl: '/sell/dashboard/cards',
    metadata: { batchId, amount },
  };

  await notificationDispatcher.dispatch(sellerId, message);
}

export async function notifySellerBatchPayoutSent(sellerId: string, batchId: number, amount: number): Promise<void> {
  const message: NotificationMessage = {
    type: 'BATCH_STATUS',
    title: `Batch #${batchId} payout on its way`,
    description: `${amount.toFixed(2)} USDT was sent to your payment method. You'll receive a confirmation once it completes.`,
    actionUrl: '/sell/dashboard/cards',
    metadata: { batchId, amount },
  };

  await notificationDispatcher.dispatch(sellerId, message);
}

export async function notifySellerBatchCancelled(sellerId: string, batchId: number): Promise<void> {
  const message: NotificationMessage = {
    type: 'BATCH_CANCELLED',
    title: `Batch #${batchId} cancelled`,
    description: `Your batch was cancelled because all cards were reported with no balance. If you believe this is an error, please contact support.`,
    actionUrl: '/sell/dashboard/cards',
    metadata: { batchId },
  };

  await notificationDispatcher.dispatch(sellerId, message);
}

export async function notifySellerBatchDeleted(sellerId: string, batchId: number): Promise<void> {
  const message: NotificationMessage = {
    type: 'BATCH_DELETED',
    title: `Batch #${batchId} has been deleted`,
    description: `Your batch was permanently removed by an administrator. Please contact us if you have any questions.`,
    actionUrl: '/sell/dashboard/cards',
    metadata: { batchId },
  };

  await notificationDispatcher.dispatch(sellerId, message);
}

export async function notifyAdminPaymentReceived(orderId: string, buyerName: string, amount: number, txId: string): Promise<void> {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  if (!admin) {
    return;
  }

  const message: NotificationMessage = {
    type: 'PAYMENT_PENDING',
    title: '💰 Pago recibido',
    description: `${buyerName} pagó ${amount.toFixed(2)} USDT — Orden #${orderId.slice(-8)}`,
    actionUrl: '/admin/payments',
    metadata: { orderId, buyerName, amount, txId },
  };

  await notificationDispatcher.dispatch(admin.id, message);
}

export async function notifyAdminPayoutFailed(batchId: number, amount: number, reason: string): Promise<void> {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  if (!admin) {
    return;
  }

  const message: NotificationMessage = {
    type: 'BATCH_STATUS',
    title: '⚠️ Fallo en pago automático a seller',
    description: `El pago del lote #${batchId} (${amount.toFixed(2)} USDT) falló: ${reason}. Requiere reintento manual.`,
    actionUrl: '/admin/dashboard/batches',
    metadata: { batchId, amount, reason },
  };

  await notificationDispatcher.dispatch(admin.id, message);
}

export async function notifySellerWalletRequired(sellerId: string, batchId: number): Promise<void> {
  const message: NotificationMessage = {
    type: 'BATCH_STATUS',
    title: `Batch #${batchId} ready for payout`,
    description: `Your batch is fully confirmed, but the payout is on hold because you have no payment method configured. Add one to receive your money automatically.`,
    actionUrl: '/sell/dashboard/account',
    metadata: { batchId },
  };

  await notificationDispatcher.dispatch(sellerId, message);
}
