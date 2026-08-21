// ─────────────────────────────────────────────────────────────────────────────
// Buyer / Security — Server action schemas (security PIN gate for code reveal)
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const getSecurityStatusOutputSchema = z.object({
  success: z.literal(true),
  hasPin: z.boolean(),
  hasPasskey: z.boolean(),
  pinLocked: z.boolean(),
  isUnlocked: z.boolean(),
  unlockedUntil: z.string().nullable(),
});

export const unlockWithPinInputSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'El PIN debe tener entre 4 y 6 dígitos numéricos'),
});

export const unlockOutputSchema = z.object({
  success: z.literal(true),
  unlockedUntil: z.string(),
});

export const setSecurityPinInputSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'El PIN debe tener entre 4 y 6 dígitos numéricos'),
});

export const changeSecurityPinInputSchema = z.object({
  currentPin: z.string().regex(/^\d{4,6}$/, 'El PIN debe tener entre 4 y 6 dígitos numéricos'),
  newPin: z.string().regex(/^\d{4,6}$/, 'El PIN debe tener entre 4 y 6 dígitos numéricos'),
});

export const pinMutationOutputSchema = z.object({
  success: z.literal(true),
});

export const confirmPinResetInputSchema = z.object({
  otp: z.string().length(6, 'El código tiene 6 dígitos'),
  newPin: z.string().regex(/^\d{4,6}$/, 'El PIN debe tener entre 4 y 6 dígitos numéricos'),
});
