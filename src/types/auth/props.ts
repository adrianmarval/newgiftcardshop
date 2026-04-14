// ─────────────────────────────────────────────────────────────────────────────
// Auth Types — Component prop interfaces for auth & profile flows
// ─────────────────────────────────────────────────────────────────────────────

import type { Portal } from "./states";

// ── Profile Form Props ────────────────────────────────────────────────────────

/**
 * Props for the ProfileForm component.
 * The `user` object contains only the fields that the profile form displays
 * and mutates — it is intentionally narrower than the full Prisma User model.
 */
export interface ProfileFormProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
    twoFactorEnabled: boolean;
  };
  portal: Portal;
}

/**
 * Props for the Verify2FAForm component.
 * The portal determines which dashboard to redirect to on success.
 */
export interface Verify2FAFormProps {
  portal: Portal;
}

// ── Auth Form Props ───────────────────────────────────────────────────────────

/**
 * Props for the LoginForm component.
 */
export interface LoginFormProps {
  portal: Portal;
  title: string;
  subtitle: string;
  forgotPasswordUrl: string;
  emailPlaceholder?: string;
  registerUrl?: string;
  registerPrompt?: string;
  registerLinkText?: string;
}

/**
 * Props for the RegisterForm component.
 */
export interface RegisterFormProps {
  portal: "buy" | "sell";
  redirectTo: string;
  loginUrl: string;
  title: string;
  subtitle: string;
}

/**
 * Props for the SecuritySection component in the profile page.
 */
export interface SecuritySectionProps {
  isPending?: boolean;
}

/**
 * Props for the ProfileInfoSection component in the profile page.
 */
export interface ProfileInfoSectionProps {
  name: string;
  email: string;
}

/**
 * Props for the TwoFactorSection component in the profile page.
 */
export interface TwoFactorSectionProps {
  initialEnabled: boolean;
}
