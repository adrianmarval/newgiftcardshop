// ─────────────────────────────────────────────────────────────────────────────
// Auth Types — Form action states
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
