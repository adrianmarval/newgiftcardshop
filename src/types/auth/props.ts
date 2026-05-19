// ─────────────────────────────────────────────────────────────────────────────
// Auth — Props de componentes
// Interfaces de props para componentes de autenticación y perfil.
// ─────────────────────────────────────────────────────────────────────────────

import type { AppSection } from '@/types/application/shared/AppSection';

// ── Profile Form Props ────────────────────────────────────────────────────────

/**
 * Props para ProfileForm.
 * El objeto `user` contiene solo los campos que el form muestra y muta —
 * es intencionalmente más angosto que el modelo Prisma completo.
 */
export interface ProfileFormProps {
  user: {
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    twoFactorEnabled: boolean;
    telegramUser?: {
      username: string | null;
      firstName: string | null;
      lastName: string | null;
      photoUrl: string | null;
      languageCode: string | null;
    } | null;
  };
  portal: AppSection;
  telegramLinkUrl?: string | null;
}

/** Props para Verify2FAForm. El portal determina el dashboard de redirect post-2FA. */
export interface Verify2FAFormProps {
  portal: AppSection;
}

/** Props para LoginForm. */
export interface LoginFormProps {
  portal: AppSection;
  title: string;
  subtitle: string;
  forgotPasswordUrl: string;
  emailPlaceholder?: string;
  registerUrl?: string;
  registerPrompt?: string;
  registerLinkText?: string;
}

/**
 * Props para RegisterForm.
 * Solo permite 'buy' y 'sell' (admin no se registra vía este form).
 */
export interface RegisterFormProps {
  portal: 'buy' | 'sell';
  redirectTo: string;
  loginUrl: string;
  title: string;
  subtitle: string;
}

/** Props para SecuritySection en la página de profile. */
export interface SecuritySectionProps {
  isPending?: boolean;
}

/** Props para ProfileInfoSection en la página de profile. */
export interface ProfileInfoSectionProps {
  name: string;
  email: string;
  emailVerified: boolean;
  portal: AppSection;
  telegramUser?: {
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    photoUrl: string | null;
    languageCode: string | null;
  } | null;
  telegramLinkUrl?: string | null;
}

/** Props para TwoFactorSection en la página de profile. */
export interface TwoFactorSectionProps {
  initialEnabled: boolean;
}
