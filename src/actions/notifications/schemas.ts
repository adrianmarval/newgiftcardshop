// ─────────────────────────────────────────────────────────────────────────────
// Notifications — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const listNotificationsInputSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
  filter: z.enum(['all', 'unread']).optional().default('all'),
});

export const listNotificationsOutputSchema = z.object({
  success: z.literal(true),
  notifications: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      type: z.string(),
      read: z.boolean(),
      actionUrl: z.string().nullable(),
      metadata: z.record(z.string(), z.unknown()).nullable(),
      createdAt: z.date(),
    }),
  ),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  hasMore: z.boolean(),
});

export const markAsReadInputSchema = z.object({
  notificationId: z.string().optional(),
  all: z.boolean().optional(),
});

export const markAsReadOutputSchema = z.union([
  z.object({ success: z.literal(true), updated: z.number() }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export const updateNotificationPreferencesInputSchema = z.object({
  telegramEnabled: z.boolean().optional(),
  stockAlertsEnabled: z.boolean().optional(),
  subscribedBrandCountryIds: z.array(z.string().min(1)).optional(),
});

export const updateNotificationPreferencesOutputSchema = z.object({
  success: z.literal(true),
  preference: z.object({
    telegramEnabled: z.boolean(),
    stockAlertsEnabled: z.boolean(),
  }),
});

export const getUnreadCountOutputSchema = z.object({ success: z.literal(true), count: z.number() });

export const savePushSubscriptionInputSchema = z.object({
  endpoint: z.url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  userAgent: z.string().max(300).optional(),
});

export const savePushSubscriptionOutputSchema = z.object({ success: z.literal(true) });

export const deletePushSubscriptionInputSchema = z.object({
  endpoint: z.url(),
});

export const deletePushSubscriptionOutputSchema = z.object({ success: z.literal(true) });

export const sendTestPushInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  portal: z.enum(['buyer', 'seller', 'admin']),
});

export const sendTestPushOutputSchema = z.object({
  success: z.literal(true),
  status: z.enum(['sent', 'skipped', 'failed']),
  reason: z.string().optional(),
  error: z.string().optional(),
});