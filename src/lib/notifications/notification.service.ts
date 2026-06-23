import prisma from '@/lib/prisma';
import { notificationDispatcher } from './dispatcher';
import type { NotificationMessage } from './types';
import type { NotificationType } from '@/generated/prisma/client';
import { getAccessibleStockSummary } from '@/lib/services/tier-estimation.service';

interface TierDropEvent {
  giftcardId: string;
  brandCountryId: string;
  oldTier: number;
  newTier: number;
}

interface BrandCountryInfo {
  brandName: string;
  countryName: string;
}

async function getBrandCountryInfo(brandCountryId: string): Promise<BrandCountryInfo | null> {
  const bc = await prisma.brandCountry.findUnique({
    where: { id: brandCountryId },
    select: {
      brand: { select: { name: true } },
      country: { select: { name: true } },
    },
  });
  if (!bc) return null;
  return {
    brandName: bc.brand.name,
    countryName: bc.country.name,
  };
}

async function hasBeenNotified(userId: string, type: NotificationType, referenceType: string, referenceId: string): Promise<boolean> {
  const existing = await prisma.notificationLog.findUnique({
    where: {
      userId_type_referenceType_referenceId: {
        userId,
        type,
        referenceType,
        referenceId,
      },
    },
    select: { id: true },
  });
  return existing !== null;
}

async function recordNotificationLog(userId: string, type: NotificationType, referenceType: string, referenceId: string): Promise<void> {
  try {
    await prisma.notificationLog.create({
      data: { userId, type, referenceType, referenceId },
    });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'P2002') return;
    throw err;
  }
}

export class NotificationService {
  async notifyBuyersStockAvailable(brandCountryId: string, initialTier: number | null, batchId: number): Promise<void> {
    const info = await getBrandCountryInfo(brandCountryId);
    if (!info) return;

    const effectiveTier = initialTier ?? 85;

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

    const buyersToNotify = eligibleRates.filter((rate) => {
      const buyerBuyRate = Math.floor(rate.buyRate.toNumber() * 100);
      return buyerBuyRate >= effectiveTier;
    });

    if (buyersToNotify.length === 0) return;

    for (const rate of buyersToNotify) {
      const alreadyNotified = await hasBeenNotified(rate.user.id, 'STOCK_AVAILABLE', 'BATCH', batchId.toString());
      if (alreadyNotified) continue;

      if (rate.user.notificationPreference) {
        const subs = rate.user.notificationPreference.subscriptions;
        if (subs.length > 0 && !subs.some((s) => s.brandCountryId === brandCountryId)) continue;
      }

      const buyerBuyRate = Math.floor(rate.buyRate.toNumber() * 100);
      const summary = await getAccessibleStockSummary(brandCountryId, buyerBuyRate);
      const stockText =
        summary.cardCount > 0
          ? `Hay $${summary.totalAmount.toFixed(2)} disponibles para tu tasa del ${buyerBuyRate}%`
          : `Nuevo stock publicado (tier inicial: ${effectiveTier}%)`;

      const message: NotificationMessage = {
        type: 'STOCK_AVAILABLE',
        title: `${info.brandName} ${info.countryName} disponible`,
        description: stockText,
        actionUrl: '/store/dashboard/browse-cards',
        metadata: {
          brandName: info.brandName,
          countryName: info.countryName,
          initialTier: effectiveTier,
          batchId,
          accessibleAmount: summary.totalAmount.toString(),
          accessibleCardCount: summary.cardCount,
        },
      };

      await recordNotificationLog(rate.user.id, 'STOCK_AVAILABLE', 'BATCH', batchId.toString()).catch(() => {});
      await notificationDispatcher.dispatch(rate.user.id, message);
    }
  }

  async notifyBuyersTierDrop(events: TierDropEvent[]): Promise<void> {
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

      const notifiedBuyers = new Set<string>();

      for (const event of groupEvents) {
        const buyersInCrossover = eligibleRates.filter((rate) => {
          const buyerBuyRate = Math.floor(rate.buyRate.toNumber() * 100);
          return buyerBuyRate >= event.newTier && buyerBuyRate < event.oldTier;
        });

        for (const rate of buyersInCrossover) {
          if (notifiedBuyers.has(rate.userId)) continue;

          const alreadyNotified = await hasBeenNotified(rate.userId, 'TIER_DROP_ACCESS', 'GIFTCARD', event.giftcardId);
          if (alreadyNotified) continue;

          if (rate.user.notificationPreference) {
            const subs = rate.user.notificationPreference.subscriptions;
            if (subs.length > 0 && !subs.some((s) => s.brandCountryId === brandCountryId)) continue;
          }

          const buyerBuyRate = Math.floor(rate.buyRate.toNumber() * 100);
          const summary = await getAccessibleStockSummary(brandCountryId, buyerBuyRate);
          const stockText =
            summary.cardCount > 0
              ? `Hay $${summary.totalAmount.toFixed(2)} disponibles en ${info.brandName} ${info.countryName} para tu tasa del ${buyerBuyRate}%.`
              : `El tier bajó de ${event.oldTier}% a ${event.newTier}%. Nueva tarjeta disponible para tu tasa.`;

          const message: NotificationMessage = {
            type: 'TIER_DROP_ACCESS',
            title: `${info.brandName} ${info.countryName} disponible`,
            description: stockText,
            actionUrl: '/store/dashboard/browse-cards',
            metadata: {
              brandName: info.brandName,
              countryName: info.countryName,
              oldTier: event.oldTier,
              newTier: event.newTier,
              giftcardId: event.giftcardId,
              accessibleAmount: summary.totalAmount.toString(),
              accessibleCardCount: summary.cardCount,
            },
          };

          notifiedBuyers.add(rate.userId);

          for (const ev of groupEvents) {
            const buyerRate = Math.floor(rate.buyRate.toNumber() * 100);
            if (buyerRate >= ev.newTier && buyerRate < ev.oldTier) {
              await recordNotificationLog(rate.userId, 'TIER_DROP_ACCESS', 'GIFTCARD', ev.giftcardId).catch(() => {});
            }
          }

          await notificationDispatcher.dispatch(rate.userId, message);
        }
      }
    }
  }

  async notifySellerBatchPaid(sellerId: string, batchId: number, amount: number): Promise<void> {
    const message: NotificationMessage = {
      type: 'BATCH_PAID',
      title: `Lote #${batchId} liquidado`,
      description: `${amount.toFixed(2)} USDT transferidos a tu cuenta`,
      actionUrl: '/sell/dashboard/cards',
      metadata: { batchId, amount },
    };

    await notificationDispatcher.dispatch(sellerId, message);
  }
}

export const notificationService = new NotificationService();
