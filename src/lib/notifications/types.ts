import type { NotificationType } from '@/generated/prisma/client';
import { Role as UserRole } from '@/generated/prisma/enums';
export { UserRole };

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
