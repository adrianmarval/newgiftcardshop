// ─────────────────────────────────────────────────────────────────────────────
// User — Account entity types
// ─────────────────────────────────────────────────────────────────────────────

import type { Role } from '@/generated/prisma/enums';
import { z } from 'zod';

export interface TelegramUserInfo {
  telegramId: string;
  username: string | null;
  firstName: string | null;
  hasPhoto: boolean;
}

/** Full buyer shape used by admin order cards, per-giftcard buyer info, and the buyer dialog. */
export interface AdminBuyerSummary {
  id: string;
  name: string;
  email: string;
  buyRate: number;
  orderCount: number;
  createdAt: string;
  twoFactorEnabled: boolean;
  telegramUser: TelegramUserInfo | null;
}

/** Full seller shape used by admin batch cards, per-giftcard seller info, and the seller dialog. */
export interface AdminSellerSummary {
  id: string;
  name: string;
  email: string;
  sellRate: number;
  orderCount: number;
  createdAt: string;
  twoFactorEnabled: boolean;
  telegramUser: TelegramUserInfo | null;
}

// ── Shared Zod sub-schemas ────────────────────────────────────────────────────

export const telegramUserInfoSchema = z.object({
  telegramId: z.string(),
  username: z.string().nullable(),
  firstName: z.string().nullable(),
  hasPhoto: z.boolean(),
});

export const adminBuyerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  buyRate: z.number(),
  orderCount: z.number(),
  createdAt: z.string(),
  twoFactorEnabled: z.boolean(),
  telegramUser: telegramUserInfoSchema.nullable(),
});

export const adminSellerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  sellRate: z.number(),
  orderCount: z.number(),
  createdAt: z.string(),
  twoFactorEnabled: z.boolean(),
  telegramUser: telegramUserInfoSchema.nullable(),
});

export const userPaymentMethodSchema = z.object({
  address: z.string(),
  isBinanceWallet: z.boolean(),
  updatedAt: z.date(),
  coin: z.object({ symbol: z.string(), name: z.string() }),
  network: z.object({ name: z.string(), description: z.string() }),
});

export type UserPaymentMethodSummary = z.infer<typeof userPaymentMethodSchema>;

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  creditLimit: number;
  minAmountPreference: number | null;
  maxAmountPreference: number | null;
  allowSearchPreferences: boolean;
  allowBuyRateAdjustment: boolean;
  createdAt: Date;
  telegramUser?: TelegramUserInfo | null;
  paymentMethod?: UserPaymentMethodSummary | null;
}

export interface UserRate {
  id: string;
  brandCountryId: string;
  brandName: string;
  countryName: string;
  countryCode: string;
  buyRate: number;
  sellRate: number;
}