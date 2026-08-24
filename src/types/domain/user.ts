// ─────────────────────────────────────────────────────────────────────────────
// User — Account entity types
// ─────────────────────────────────────────────────────────────────────────────

import type { Role } from '@/generated/prisma/enums';

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
  telegramUser?: {
    telegramId: string;
    username: string | null;
    firstName: string | null;
    hasPhoto: boolean;
  } | null;
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