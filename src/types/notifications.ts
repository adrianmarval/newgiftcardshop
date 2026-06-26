// ─────────────────────────────────────────────────────────────────────────────
// Notification types — shared between lib/services and components
// ─────────────────────────────────────────────────────────────────────────────

import type { NotificationType } from '@/generated/prisma/enums';

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
