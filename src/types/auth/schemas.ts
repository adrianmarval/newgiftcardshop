// ─────────────────────────────────────────────────────────────────────────────
// Auth — Schemas de validación y acciones
// Zod schemas para validación de forms y I/O de server actions.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

// ── Login ─────────────────────────────────────────────────────────────────────

/** Schema de entrada para login */
export const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  portal: z.enum(['sell', 'buy', 'admin']),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Schema de salida para login */
export const loginOutputSchema = z.union([z.object({ success: z.literal(true), redirectTo: z.string() }), z.object({ error: z.string() })]);

// ── Register ──────────────────────────────────────────────────────────────────

/**
 * Schema de entrada para register.
 * Valida password con requisitos: 8+ chars, uppercase, lowercase, number, special char.
 * Usa refine para confirmar que passwords coinciden.
 */
export const registerSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required'),
    email: z.email('Invalid email address'),
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

/** Schema de salida para register */
export const registerOutputSchema = z.union([
  z.object({ success: z.literal(true), redirectTo: z.string() }),
  z.object({ error: z.string() }),
]);

// ── Forgot Password ────────────────────────────────────────────────────────────

/** Schema de entrada para forgotPassword */
export const forgotPasswordSchema = z.object({
  email: z.email('Invalid email address'),
  portal: z.enum(['sell', 'buy', 'admin']),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** Schema de salida para forgotPassword */
export const forgotPasswordOutputSchema = z.union([
  z.object({ success: z.literal(true), email: z.string() }),
  z.object({ error: z.string() }),
]);

// ── Reset Password ─────────────────────────────────────────────────────────────

/**
 * Schema de entrada para resetPassword.
 * Requiere token del email más nuevo password con los mismos requisitos de complejidad.
 */
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

/** Schema de salida para resetPassword */
export const resetPasswordOutputSchema = z.union([
  z.object({ success: z.literal(true), redirectTo: z.string() }),
  z.object({ error: z.string() }),
]);

// ── Verify Email ────────────────────────────────────────────────────────────────

/** Schema de entrada para verifyEmail (con token del email). */
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
  portal: z.enum(['sell', 'buy', 'admin']),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

/** Schema de salida para verifyEmail */
export const verifyEmailOutputSchema = z.union([
  z.object({ success: z.literal(true), redirectTo: z.string() }),
  z.object({ error: z.string() }),
]);

// ── Resend Verification ────────────────────────────────────────────────────────

/** Schema de entrada para resendVerification */
export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
  portal: z.enum(['sell', 'buy', 'admin']),
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

/** Schema de salida para resendVerification */
export const resendVerificationOutputSchema = z.union([z.object({ success: z.literal(true) }), z.object({ error: z.string() })]);

// ── Verify 2FA ────────────────────────────────────────────────────────────────

/** Schema de entrada para verify2FA (código TOTP o backup code). */
export const verify2FASchema = z.object({
  code: z.string().min(1, 'Code is required'),
  backupCode: z.string().optional(),
  portal: z.enum(['sell', 'buy', 'admin']),
});

export type Verify2FAInput = z.infer<typeof verify2FASchema>;

/** Schema de salida para verify2FA */
export const verify2FAOutputSchema = z.union([
  z.object({ success: z.literal(true), redirectTo: z.string() }),
  z.object({ error: z.string() }),
]);

// ── Update Profile ─────────────────────────────────────────────────────────────

/**
 * Schema de entrada para updateProfile.
 * currentPassword requerido solo si se cambia password.
 * newPassword opcional (si no se provee, no se cambia).
 */
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

/** Schema de salida para updateProfile */
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

/** Schema de entrada para logout. Default: 'buy'. */
export const logoutSchema = z.object({
  portal: z.enum(['sell', 'buy', 'admin']).default('buy'),
});

export type LogoutInput = z.infer<typeof logoutSchema>;

/** Schema de salida para logout */
export const logoutOutputSchema = z.object({ success: z.literal(true) });
