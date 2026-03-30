// ─────────────────────────────────────────────────────────────────────────────
// Auth Types — Form action states and component props for auth & profile flows
// ─────────────────────────────────────────────────────────────────────────────

// ── Form Action States ────────────────────────────────────────────────────────

/**
 * State shape returned by the updateProfile server action.
 * Used with React's useActionState hook in ProfileForm.
 */
export type ProfileState = { error?: string; success?: boolean } | null;

/**
 * State shape returned by the forgotPassword server action.
 * Includes the submitted email so the UI can display it in the success message.
 */
export type ForgotPasswordState = {
  error?: string;
  success?: boolean;
  email?: string;
} | null;

/**
 * State shape returned by the resendVerification server action.
 * Used with React's useActionState hook in VerifyEmailForm.
 */
export type ResendState = { error?: string; success?: boolean } | null;

// ── Portal ────────────────────────────────────────────────────────────────────

/**
 * The three portals in the platform.
 * Used across auth components to determine redirect paths and labels.
 */
export type Portal = "admin" | "buy" | "sell";

// ── Component Props ───────────────────────────────────────────────────────────

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
