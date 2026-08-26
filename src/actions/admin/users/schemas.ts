// ─────────────────────────────────────────────────────────────────────────────
// Admin / Users — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { paginatedOutputSchema } from '@/types';

export const listUsersInputSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
  search: z.string().optional().default(''),
  role: z.enum(['ALL', 'ADMIN', 'SELLER', 'BUYER']).optional().default('ALL'),
  isActive: z.boolean().optional(),
});

export const listUsersOutputSchema = paginatedOutputSchema(
  z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.enum(['ADMIN', 'SELLER', 'BUYER']),
      isActive: z.boolean(),
      creditLimit: z.number(),
      minAmountPreference: z.number().nullable(),
      maxAmountPreference: z.number().nullable(),
      allowSearchPreferences: z.boolean(),
      allowBuyRateAdjustment: z.boolean(),
      createdAt: z.date(),
      telegramUser: z
        .object({
          telegramId: z.string(),
          username: z.string().nullable(),
          firstName: z.string().nullable(),
          hasPhoto: z.boolean(),
        })
        .nullable(),
    })
    .array(),
);

export type GetUsersInput = z.infer<typeof listUsersInputSchema>;
export type GetUsersOutput = z.infer<typeof listUsersOutputSchema>;

export const updateUserInputSchema = z.object({
  userId: z.string(),
  role: z.enum(['ADMIN', 'SELLER', 'BUYER']).optional(),
  isActive: z.boolean().optional(),
  creditLimit: z.number().optional(),
  minAmountPreference: z.number().nullable().optional(),
  maxAmountPreference: z.number().nullable().optional(),
  allowSearchPreferences: z.boolean().optional(),
  allowBuyRateAdjustment: z.boolean().optional(),
});

export const updateUserOutputSchema = z.object({
  success: z.literal(true),
  userId: z.string(),
});

export const getUsersByRoleInputSchema = z.object({ role: z.enum(['BUYER', 'SELLER', 'ADMIN']) });

export const getUsersByRoleOutputSchema = z.object({
  success: z.literal(true),
  users: z.array(z.object({ id: z.string(), name: z.string(), email: z.string() })),
});

export const getUserRatesInputSchema = z.object({ userId: z.string() });

export const getUserRatesOutputSchema = z.object({
  success: z.literal(true),
  rates: z.array(
    z.object({
      id: z.string(),
      brandCountryId: z.string(),
      brandName: z.string(),
      countryName: z.string(),
      countryCode: z.string(),
      buyRate: z.number(),
      sellRate: z.number(),
    }),
  ),
});

export const updateUserRatesInputSchema = z.object({
  userId: z.string(),
  brandCountryId: z.string(),
  buyRate: z.number().min(0).max(1),
  sellRate: z.number().min(0).max(1),
});

export const updateUserRatesOutputSchema = z.object({ success: z.literal(true) });

export const deleteUserRatesInputSchema = z.object({
  userId: z.string(),
  brandCountryId: z.string(),
});

export const deleteUserRatesOutputSchema = z.object({ success: z.literal(true) });

export const unlinkTelegramInputSchema = z.object({ userId: z.string() });

export const unlinkTelegramOutputSchema = z.object({
  success: z.literal(true),
  unlinked: z.literal(true),
});