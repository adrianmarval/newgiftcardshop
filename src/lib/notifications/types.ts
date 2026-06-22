import type { NotificationType } from '@/generated/prisma/client';

export type UserRole = 'BUYER' | 'SELLER' | 'ADMIN';

export interface NotificationMessage {
  type: NotificationType;
  title: string;
  description: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationContext {
  userId: string;
  userRole: UserRole;
}

export interface NotificationChannel {
  readonly name: 'web' | 'telegram' | 'whatsapp';

  send(ctx: NotificationContext, message: NotificationMessage): Promise<NotificationChannelResult>;
}

export type NotificationChannelResult =
  | { status: 'sent' }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string };

export type NotificationReferenceType = 'BRAND_COUNTRY' | 'GIFTCARD' | 'BATCH' | 'ORDER';
