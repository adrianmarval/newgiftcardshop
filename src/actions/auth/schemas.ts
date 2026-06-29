// ─────────────────────────────────────────────────────────────────────────────
// Auth — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { portalSchema } from '@/types';

/** Password validation rules shared by register and reset-password. */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain a special character');

export const loginInputSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().trim().min(1, 'Password is required'),
  portal: portalSchema,
});

export const loginOutputSchema = z.union([
  z.object({ success: z.literal(true), redirectTo: z.string() }),
  z.object({ success: z.literal(false), error: z.string().optional(), needsVerification: z.boolean().optional() }),
]);

export const registerInputSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Full name is required'),
    email: z.email('Invalid email address'),
    password: passwordSchema,
    confirmPassword: z.string().trim(),
    portal: z.enum(['sell', 'buy', 'admin']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const registerOutputSchema = z.union([
  z.object({ success: z.literal(true), redirectTo: z.string() }),
  z.object({ error: z.string() }),
]);

export const logoutInputSchema = z.object({
  portal: portalSchema,
});

export const logoutOutputSchema = z.object({
  success: z.literal(true),
  redirectTo: z.string(),
});

export const forgotPasswordInputSchema = z.object({
  email: z.email('Invalid email address'),
  portal: portalSchema,
});

export const forgotPasswordOutputSchema = z.union([
  z.object({ success: z.literal(true), email: z.string() }),
  z.object({ error: z.string() }),
]);

export const resetPasswordInputSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
    portal: portalSchema,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const resetPasswordOutputSchema = z.union([
  z.object({ success: z.literal(true), redirectTo: z.string() }),
  z.object({ error: z.string() }),
]);

export const resendVerificationInputSchema = z.object({
  email: z.email('Invalid email address'),
  portal: portalSchema,
});

export const resendVerificationOutputSchema = z.union([
  z.object({ success: z.literal(true) }),
  z.object({ error: z.string() }),
]);

export const updateProfileInputSchema = z.object({
  name: z.string().trim().min(2).optional().catch(undefined),
  currentPassword: z.string().trim().optional(),
  newPassword: z
    .string()
    .trim()
    .optional()
    .refine((val) => {
      if (!val || val.length === 0) return true;
      return val.length >= 8;
    }, 'New password must be at least 8 characters'),
  confirmPassword: z.string().trim().optional(),
});

export const updateProfileOutputSchema = z.union([
  z.object({
    success: z.literal(true),
    user: z.object({ name: z.string(), email: z.string(), image: z.string().nullable() }),
  }),
  z.object({ success: z.literal(false), error: z.string() }),
]);