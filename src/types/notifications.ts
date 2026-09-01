// ─────────────────────────────────────────────────────────────────────────────
// Notifications — Types shared between lib/, actions/, and components
// ─────────────────────────────────────────────────────────────────────────────

import type { NotificationType } from '@/generated/prisma/enums';
import type { Role } from '@/generated/prisma/enums';
import type { Decimal } from '@prisma/client/runtime/client';

// ── UI Item ─────────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  read: boolean;
  type: NotificationType;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ── Dispatch Layer ──────────────────────────────────────────────────────────

export interface NotificationMessage {
  type: NotificationType;
  title: string;
  description: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationContext {
  userId: string;
  userRole: Role;
}

export interface NotificationChannel {
  readonly name: 'web' | 'telegram' | 'webpush';

  send(ctx: NotificationContext, message: NotificationMessage): Promise<NotificationChannelResult>;
}

export type NotificationChannelResult =
  | { status: 'sent' }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string };

export type NotificationReferenceType = 'BRAND_COUNTRY' | 'GIFTCARD' | 'BATCH' | 'ORDER';

// ── Subscriptions ───────────────────────────────────────────────────────────

export interface SubscribedBrandCountry {
  id: string;
  brandName: string;
  brandIcon: string;
  brandImage: string | null;
  countryName: string;
  countryCode: string;
  countryCurrency: string;
  subscribed: boolean;
}

// ── Page Data ───────────────────────────────────────────────────────────────

export interface NotificationPageData {
  notifications: NotificationItem[];
  unreadCount: number;
  preference: {
    telegramEnabled: boolean;
    pushEnabled: boolean;
    stockAlertsEnabled: boolean;
  } | null;
}

// ── Brand Country Info ──────────────────────────────────────────────────────

export interface BrandCountryInfo {
  brandId: string;
  countryId: string;
  brandName: string;
  countryName: string;
  countryCode: string;
}

// ── Eligible Buyer ──────────────────────────────────────────────────────────

export interface EligibleBuyer {
  userId: string;
  buyRate: Decimal;
  notificationPreference: {
    subscriptions: { brandCountryId: string }[];
  } | null;
}