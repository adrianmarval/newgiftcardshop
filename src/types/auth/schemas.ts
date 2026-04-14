// ─────────────────────────────────────────────────────────────────────────────
// Auth Schemas — Form validation & Input/Output Zod schemas for auth actions
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

// ── Login ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  portal: z.enum(['sell', 'buy', 'admin']),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const loginOutputSchema = z.union([z.object({ success: z.literal(true), redirectTo: z.string() }), z.object({ error: z.string() })]);

// ── Register ──────────────────────────────────────────────────────────────────

export const registerSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[0-9]/, 'Password must contain a number')
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain a special character'),
    confirmPassword: z.string(),
    portal: z.enum(['sell', 'buy']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const registerOutputSchema = z.union([
  z.object({ success: z.literal(true), redirectTo: z.string() }),
  z.object({ error: z.string() }),
]);

// ── Forgot Password ────────────────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  portal: z.enum(['sell', 'buy', 'admin']),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const forgotPasswordOutputSchema = z.union([
  z.object({ success: z.literal(true), email: z.string() }),
  z.object({ error: z.string() }),
]);

// ── Reset Password ─────────────────────────────────────────────────────────────

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[0-9]/, 'Password must contain a number')
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain a special character'),
    confirmPassword: z.string(),
    portal: z.enum(['sell', 'buy', 'admin']),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const resetPasswordOutputSchema = z.union([
  z.object({ success: z.literal(true), redirectTo: z.string() }),
  z.object({ error: z.string() }),
]);

// ── Verify Email ────────────────────────────────────────────────────────────────

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
  portal: z.enum(['sell', 'buy', 'admin']),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const verifyEmailOutputSchema = z.union([
  z.object({ success: z.literal(true), redirectTo: z.string() }),
  z.object({ error: z.string() }),
]);

// ── Resend Verification ────────────────────────────────────────────────────────

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
  portal: z.enum(['sell', 'buy', 'admin']),
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

export const resendVerificationOutputSchema = z.union([z.object({ success: z.literal(true) }), z.object({ error: z.string() })]);

// ── Verify 2FA ────────────────────────────────────────────────────────────────

export const verify2FASchema = z.object({
  code: z.string().min(1, 'Code is required'),
  backupCode: z.string().optional(),
  portal: z.enum(['sell', 'buy', 'admin']),
});

export type Verify2FAInput = z.infer<typeof verify2FASchema>;

export const verify2FAOutputSchema = z.union([
  z.object({ success: z.literal(true), redirectTo: z.string() }),
  z.object({ error: z.string() }),
]);

// ── Update Profile ─────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val.length === 0) return true;
      return val.length >= 8;
    }, 'New password must be at least 8 characters'),
  confirmPassword: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateProfileOutputSchema = z.union([
  z.object({
    success: z.literal(true),
    user: z.object({
      name: z.string(),
      email: z.string(),
      image: z.string().nullable(),
    }),
  }),
  z.object({ error: z.string() }),
]);

// ── Logout ────────────────────────────────────────────────────────────────────

export const logoutSchema = z.object({
  portal: z.enum(['sell', 'buy', 'admin']).default('buy'),
});

export type LogoutInput = z.infer<typeof logoutSchema>;

export const logoutOutputSchema = z.object({ success: z.literal(true) });
