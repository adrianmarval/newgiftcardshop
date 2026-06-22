import prisma from '@/lib/prisma';
import { notificationDispatcher } from './dispatcher';
import type { NotificationMessage } from './types';
import type { NotificationType } from '@/generated/prisma/client';

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

async function hasBeenNotified(
  userId: string,
  type: NotificationType,
  referenceType: string,
  referenceId: string,
): Promise<boolean> {
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

async function recordNotificationLog(
  userId: string,
  type: NotificationType,
  referenceType: string,
  referenceId: string,
): Promise<void> {
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
  async notifyBuyersStockAvailable(brandCountryId: string, initialTier: number | null): Promise<void> {
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
            notificationPreference: { select: { subscriptions: true } },
          },
        },
      },
    });

    const buyersToNotify = eligibleRates.filter((rate) => {
      const buyerBuyRate = Math.floor(rate.buyRate.toNumber() * 100);
      return buyerBuyRate >= effectiveTier;
    });

    if (buyersToNotify.length === 0) return;

    const message: NotificationMessage = {
      type: 'STOCK_AVAILABLE',
      title: `${info.brandName} ${info.countryName} disponible`,
      description: `Nuevo stock disponible para compra. Tier inicial: ${effectiveTier}%`,
      actionUrl: '/store/dashboard/browse-cards',
      metadata: { brandName: info.brandName, countryName: info.countryName, initialTier: effectiveTier },
    };

    const userIds: string[] = [];
    for (const rate of buyersToNotify) {
      const alreadyNotified = await hasBeenNotified(rate.user.id, 'STOCK_AVAILABLE', 'BRAND_COUNTRY', brandCountryId);
      if (alreadyNotified) continue;
      userIds.push(rate.user.id);
      await recordNotificationLog(rate.user.id, 'STOCK_AVAILABLE', 'BRAND_COUNTRY', brandCountryId).catch(() => {});
    }

    if (userIds.length === 0) return;

    await notificationDispatcher.dispatchMany(userIds, message);
  }

  async notifyBuyersTierDrop(events: TierDropEvent[]): Promise<void> {
    if (events.length === 0) return;

    const brandCountryInfoCache = new Map<string, BrandCountryInfo | null>();

    for (const event of events) {
      const oldTier = event.oldTier;
      const newTier = event.newTier;

      if (newTier >= oldTier) continue;

      let info = brandCountryInfoCache.get(event.brandCountryId);
      if (info === undefined) {
        info = await getBrandCountryInfo(event.brandCountryId);
        brandCountryInfoCache.set(event.brandCountryId, info);
      }
      if (!info) continue;

      const eligibleRates = await prisma.userBrandCountryRate.findMany({
        where: {
          brandCountryId: event.brandCountryId,
          user: {
            role: 'BUYER',
            isActive: true,
          },
        },
        select: { userId: true, buyRate: true },
      });

      const buyersInCrossover = eligibleRates.filter((rate) => {
        const buyerBuyRate = Math.floor(rate.buyRate.toNumber() * 100);
        return buyerBuyRate >= newTier && buyerBuyRate < oldTier;
      });

      if (buyersInCrossover.length === 0) continue;

      const message: NotificationMessage = {
        type: 'TIER_DROP_ACCESS',
        title: `${info.brandName} ${info.countryName} accesible`,
        description: `El tier bajó de ${oldTier}% a ${newTier}%. Ya podés acceder a esta tarjeta.`,
        actionUrl: '/store/dashboard/browse-cards',
        metadata: {
          brandName: info.brandName,
          countryName: info.countryName,
          oldTier,
          newTier,
          giftcardId: event.giftcardId,
        },
      };

      const userIds: string[] = [];
      for (const rate of buyersInCrossover) {
        const alreadyNotified = await hasBeenNotified(rate.userId, 'TIER_DROP_ACCESS', 'GIFTCARD', event.giftcardId);
        if (alreadyNotified) continue;
        userIds.push(rate.userId);
        await recordNotificationLog(rate.userId, 'TIER_DROP_ACCESS', 'GIFTCARD', event.giftcardId).catch(() => {});
      }

      if (userIds.length === 0) continue;

      await notificationDispatcher.dispatchMany(userIds, message);
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
